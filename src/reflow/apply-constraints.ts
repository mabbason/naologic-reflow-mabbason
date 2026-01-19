import { DateTime } from 'luxon';
import type { WorkOrder } from './types.js';

export function applyConstraints(
  order: WorkOrder,
  scheduledOrders: Map<string, WorkOrder>
): WorkOrder {
  if (order.data.isMaintenance) {
    return order;
  }

  let scheduled = order;

  scheduled = applyDependencyConstraint(scheduled, scheduledOrders);
  scheduled = applyConflictConstraint(scheduled, scheduledOrders);
  // scheduled = applyShiftConstraint(scheduled);
  // scheduled = applyMaintenanceConstraint(scheduled);

  return scheduled;
}

export function applyDependencyConstraint(
  order: WorkOrder,
  scheduledOrders: Map<string, WorkOrder>
): WorkOrder {
  const parentIds = order.data.dependsOnWorkOrderIds;
  if (parentIds.length === 0) {
    return order;
  }

  let latestParentEnd = DateTime.fromISO(order.data.startDate);

  for (const parentId of parentIds) {
    const parent = scheduledOrders.get(parentId);
    if (!parent) {
      throw new Error(`Parent work order "${parentId}" not found in scheduled orders`);
    }

    const parentEnd = DateTime.fromISO(parent.data.endDate);
    if (parentEnd > latestParentEnd) {
      latestParentEnd = parentEnd;
    }
  }

  const orderStart = DateTime.fromISO(order.data.startDate);

  if (orderStart >= latestParentEnd) {
    return order;
  }

  const newStart = latestParentEnd.toUTC();
  const newEnd = newStart.plus({ minutes: order.data.durationMinutes });

  return {
    ...order,
    data: {
      ...order.data,
      startDate: newStart.toISO()!,
      endDate: newEnd.toISO()!,
    },
  };
}

export function applyConflictConstraint(
  order: WorkOrder,
  scheduledOrders: Map<string, WorkOrder>
): WorkOrder {
  const workCenterId = order.data.workCenterId;

  let latestEndOnWorkCenter = DateTime.fromISO(order.data.startDate);

  for (const scheduled of scheduledOrders.values()) {
    if (scheduled.data.workCenterId !== workCenterId) {
      continue;
    }

    const scheduledEnd = DateTime.fromISO(scheduled.data.endDate);
    if (scheduledEnd > latestEndOnWorkCenter) {
      latestEndOnWorkCenter = scheduledEnd;
    }
  }

  const orderStart = DateTime.fromISO(order.data.startDate);

  if (orderStart >= latestEndOnWorkCenter) {
    return order;
  }

  const newStart = latestEndOnWorkCenter.toUTC();
  const newEnd = newStart.plus({ minutes: order.data.durationMinutes });

  return {
    ...order,
    data: {
      ...order.data,
      startDate: newStart.toISO()!,
      endDate: newEnd.toISO()!,
    },
  };
}
