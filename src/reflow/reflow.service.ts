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

  // @upgrade: Use priority queue for better performance on large datasets, see algo conversation
  for (const order of sortedWorkOrdersByDep) {
    const scheduled = applyConstraints(order, scheduledOrders, workCenterMap);

    scheduledOrders.set(scheduled.docId, scheduled);

    const startChanged = order.data.startDate !== scheduled.data.startDate;
    const endChanged = order.data.endDate !== scheduled.data.endDate;

    if (startChanged || endChanged) {
      changes.push({
        workOrderId: order.docId,
        previousStartDate: order.data.startDate,
        previousEndDate: order.data.endDate,
        newStartDate: scheduled.data.startDate,
        newEndDate: scheduled.data.endDate,
        // @upgrade: Add reason/explanation explaining why the change occurred
      });
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

  // @upgrade: finshi the traceCycle function, see: algo-design conversation
  if (result.length < workOrders.length) {
    throw new Error('Circular dependency in work orders');
  }

  return result;
}
