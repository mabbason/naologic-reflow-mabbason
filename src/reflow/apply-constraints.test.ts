import { describe, it, expect } from 'vitest';
import {
  applyDependencyConstraint,
  applyConflictConstraint,
} from './apply-constraints.js';
import type { WorkOrder } from './types.js';

describe('applyDependencyConstraint', () => {
  it('pushes child start to after parent end when conflict exists', () => {
    const parentOrder: WorkOrder = {
      docId: 'parent',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-PARENT',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T08:00:00.000Z',
        endDate: '2026-01-20T10:00:00.000Z',
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const childOrder: WorkOrder = {
      docId: 'child',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-CHILD',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T09:00:00.000Z',
        endDate: '2026-01-20T10:00:00.000Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ['parent'],
      },
    };

    const scheduledOrders = new Map<string, WorkOrder>();
    scheduledOrders.set('parent', parentOrder);

    const result = applyDependencyConstraint(childOrder, scheduledOrders);

    expect(result.data.startDate).toBe('2026-01-20T10:00:00.000Z');
    expect(result.data.endDate).toBe('2026-01-20T11:00:00.000Z');
  });
});

describe('applyConflictConstraint', () => {
  it('pushes order to after previous order on same work center', () => {
    const firstOrder: WorkOrder = {
      docId: 'first',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-FIRST',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T08:00:00.000Z',
        endDate: '2026-01-20T10:00:00.000Z',
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const secondOrder: WorkOrder = {
      docId: 'second',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-SECOND',
        manufacturingOrderId: 'MO-2',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T09:00:00.000Z',
        endDate: '2026-01-20T10:00:00.000Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const scheduledOrders = new Map<string, WorkOrder>();
    scheduledOrders.set('first', firstOrder);

    const result = applyConflictConstraint(secondOrder, scheduledOrders);

    expect(result.data.startDate).toBe('2026-01-20T10:00:00.000Z');
    expect(result.data.endDate).toBe('2026-01-20T11:00:00.000Z');
  });
});
