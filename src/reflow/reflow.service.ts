import type {
  WorkOrder,
  // WorkCenter, prolly need these later
  // ManufacturingOrder,
  ReflowInput,
  ReflowOutput,
  DependencyGraph,
  ScheduleChange,
} from './types.js';

// MAIN ENTRY - START HERE
export function reflow(input: ReflowInput): ReflowOutput {
  const { workOrders } = input;

  // Build dependency graph, dependency relationships (parent/child)
  const depGraph = buildDependencyGraph(workOrders);

  // Sort deps by which one goes first
  const sortedWorkOrdersByDep = sortByDependencies(depGraph, workOrders);

  const scheduledOrders = new Map<string, WorkOrder>();
  const changes: ScheduleChange[] = [];

  for (const order of sortedWorkOrdersByDep) {
    /* Apply constraints in order (each can only push later, never earlier)
       this should work bc see "greedy forward pass" from algo conversation
       
       deps are sorted already so everything just gets moved back until everything
       is already in place... Not optimized but correct at least

       *** OPTIMIZATON NOTE: Priority Queue update later???
    */
    const scheduled = applyConstraints(order);

    scheduledOrders.set(scheduled.docId, scheduled);

    if (order.data.startDate !== scheduled.data.startDate) {
      const scheduleChange = {
        workOrderId: order.docId,
        previousStartDate: order.data.startDate,
        previousEndDate: order.data.endDate,
        newStartDate: scheduled.data.startDate,
        newEndDate: scheduled.data.endDate,
      }
      
      changes.push(scheduleChange);
    }
  }

  return {
    updatedWorkOrders: Array.from(scheduledOrders.values()),
    changes,
  };
}

/*
  **Start simple, add complexity gradually:**
    1. Get basic reflow working (ignore shifts)
    2. Add dependencies
    3. Add work center conflicts
    4. Add shift logic (hardest part!)
    5. Add maintenance windows
*/
function applyConstraints(order: WorkOrder): WorkOrder {
  // Skip maintenance orders, cannot be rescheduled
  if (order.data.isMaintenance) {
    return order;
  }

  let scheduled = order;

  scheduled = applyDependencyConstraint(scheduled);
  // scheduled = applyConflictConstraint(scheduled);
  // scheduled = applyShiftConstraint(scheduled);
  // scheduled = applyMaintenanceConstraint(scheduled);

  return scheduled;
}

function applyDependencyConstraint(order: WorkOrder): WorkOrder {
  /*
    All parents need to have completed before this can start
    keep bumping start date back until it is later than all parents endDate

    For each parent in graph.childToParents
      - If order starts before parent ends, push order start to parent end
  */

  return order;
}

// relates all work orders to each other in parent/child relationship arrays
export function buildDependencyGraph(
  workOrders: WorkOrder[]
): DependencyGraph {
  const parentToChildren = new Map<string, Set<string>>();
  const childToParents = new Map<string, Set<string>>();


    workOrders.forEach((order) => {
      const childId = order.docId;
      const parentIds = order.data.dependsOnWorkOrderIds;

      childToParents.set(childId, new Set(parentIds));

      for (const parentId of parentIds) {
        let children = parentToChildren.get(parentId);
        if (!children) {
          children = new Set();
          parentToChildren.set(parentId, children);
        }
        children.add(childId);
      }
    });

  return { parentToChildren, childToParents };
}

export function sortByDependencies(
  depGraph: DependencyGraph,
  workOrders: WorkOrder[]
): WorkOrder[] {
  const { parentToChildren, childToParents } = depGraph;

  const workOrderMap = new Map<string, WorkOrder>(
    workOrders.map(wo => [wo.docId, wo])
  );

  const parentsWaitingOn = new Map<string, number>();
  for (const wo of workOrders) {
    const parents = childToParents.get(wo.docId);
    parentsWaitingOn.set(wo.docId, parents?.size ?? 0);
  }

  const readyToSchedule: string[] = [];
  for (const [docId, waitingOn] of parentsWaitingOn) {
    if (waitingOn === 0) {
      readyToSchedule.push(docId);
    }
  }

  const result: WorkOrder[] = [];

  while (readyToSchedule.length > 0) {
    const docId = readyToSchedule.shift()!;
    const wo = workOrderMap.get(docId);
    if (wo) {
      result.push(wo);
    }

    // This order is done - update children to go to next "layer" of deps
    const children = parentToChildren.get(docId);
    if (children) {
      for (const childId of children) {
        const waitingOnCount = parentsWaitingOn.get(childId);
        if (waitingOnCount === undefined) {
          throw new Error(`Work order "${childId}" referenced but not provided`);
        }

        const remainingParents = waitingOnCount - 1;
        parentsWaitingOn.set(childId, remainingParents);

        if (remainingParents === 0) {
          readyToSchedule.push(childId);
        }
      }
    }
  }

  if (result.length < workOrders.length) {
    /*
      FROM algorithm convo, if have time or are stuck this traces the cycle
      debugging && UX so we can find the work order cycle

      const stuck = orders.filter(o => !processed.has(o.id))
      const cyclePath = traceCycle(stuck, dependencyMap)  // Follow edges until we return to start
      throw new Error(`Circular dependency: ${cyclePath.join(' → ')}`)
    */
  }

  return result;
}
