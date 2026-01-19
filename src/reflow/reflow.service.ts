import type {
  WorkOrder,
  WorkCenter,
  ReflowInput,
  ReflowOutput,
  DependencyGraph,
  ScheduleChange,
} from './types.js';
import { applyConstraints } from './apply-constraints.js';

export function reflow(input: ReflowInput): ReflowOutput {
  const { workOrders, workCenters } = input;

  const depGraph = buildDependencyGraph(workOrders);
  const sortedWorkOrdersByDep = sortByDependencies(depGraph, workOrders);

  const workCenterMap = new Map<string, WorkCenter>(
    workCenters.map((wc) => [wc.docId, wc])
  );
  const scheduledOrders = new Map<string, WorkOrder>();
  const changes: ScheduleChange[] = [];

  for (const order of sortedWorkOrdersByDep) {
    /* Apply constraints in order (each can only push later, never earlier)
       this should work bc see "greedy forward pass" from algo conversation

       deps are sorted already so everything just gets moved back until everything
       is already in place... Not optimized but correct at least

       *** OPTIMIZATON NOTE: Priority Queue update later???
    */
    const scheduled = applyConstraints(order, scheduledOrders, workCenterMap);

    scheduledOrders.set(scheduled.docId, scheduled);

    if (order.data.startDate !== scheduled.data.startDate) {
      const scheduleChange = {
        workOrderId: order.docId,
        previousStartDate: order.data.startDate,
        previousEndDate: order.data.endDate,
        newStartDate: scheduled.data.startDate,
        newEndDate: scheduled.data.endDate,
      };

      changes.push(scheduleChange);
    }
  }

  return {
    updatedWorkOrders: Array.from(scheduledOrders.values()),
    changes,
  };
}

export function buildDependencyGraph(workOrders: WorkOrder[]): DependencyGraph {
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
