import { describe, it, expect } from 'vitest';
import {
  applyDependencyConstraint,
  applyConflictConstraint,
  applyShiftAndMaintenanceConstraints,
} from './apply-constraints.js';
import type { WorkOrder, WorkCenter } from './types.js';

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

describe('applyShiftAndMaintenanceConstraints', () => {
  it('jumps workOrder start to shift and calculates end with shift-aware logic', () => {
    const order: WorkOrder = {
      docId: 'order-1',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-1',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-19T06:00:00.000Z',
        endDate: '2026-01-19T07:00:00.000Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const workCenter: WorkCenter = {
      docId: 'WC-1',
      docType: 'workCenter',
      data: {
        name: 'Work Center 1',
        shifts: [
          { dayOfWeek: 1, startHour: 8, endHour: 17 },
          { dayOfWeek: 2, startHour: 8, endHour: 17 },
          { dayOfWeek: 3, startHour: 8, endHour: 17 },
          { dayOfWeek: 4, startHour: 8, endHour: 17 },
          { dayOfWeek: 5, startHour: 8, endHour: 17 },
        ],
        maintenanceWindows: [],
      },
    };

    const workCenters = new Map<string, WorkCenter>();
    workCenters.set('WC-1', workCenter);

    const result = applyShiftAndMaintenanceConstraints(order, workCenters);

    expect(result.data.startDate).toBe('2026-01-19T08:00:00.000Z');
    expect(result.data.endDate).toBe('2026-01-19T09:00:00.000Z');
  });

  it('workOrder starts Friday and ends in weekend, correctly ends Monday', () => {
    const order: WorkOrder = {
      docId: 'order-1',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-1',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-23T16:00:00.000Z',
        endDate: '2026-01-23T18:00:00.000Z',
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const workCenter: WorkCenter = {
      docId: 'WC-1',
      docType: 'workCenter',
      data: {
        name: 'Work Center 1',
        shifts: [
          { dayOfWeek: 1, startHour: 8, endHour: 17 },
          { dayOfWeek: 2, startHour: 8, endHour: 17 },
          { dayOfWeek: 3, startHour: 8, endHour: 17 },
          { dayOfWeek: 4, startHour: 8, endHour: 17 },
          { dayOfWeek: 5, startHour: 8, endHour: 17 },
        ],
        maintenanceWindows: [],
      },
    };

    const workCenters = new Map<string, WorkCenter>();
    workCenters.set('WC-1', workCenter);

    const result = applyShiftAndMaintenanceConstraints(order, workCenters);

    expect(result.data.startDate).toBe('2026-01-23T16:00:00.000Z');
    expect(result.data.endDate).toBe('2026-01-26T09:00:00.000Z');
  });

  it('splits work around maintenance window', () => {
    const order: WorkOrder = {
      docId: 'order-1',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-1',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-19T08:00:00.000Z',
        endDate: '2026-01-19T17:00:00.000Z',
        durationMinutes: 540,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const workCenter: WorkCenter = {
      docId: 'WC-1',
      docType: 'workCenter',
      data: {
        name: 'Work Center 1',
        shifts: [
          { dayOfWeek: 1, startHour: 8, endHour: 17 },
          { dayOfWeek: 2, startHour: 8, endHour: 17 },
          { dayOfWeek: 3, startHour: 8, endHour: 17 },
          { dayOfWeek: 4, startHour: 8, endHour: 17 },
          { dayOfWeek: 5, startHour: 8, endHour: 17 },
        ],
        maintenanceWindows: [
          { startDate: '2026-01-19T10:00:00.000Z', endDate: '2026-01-19T14:00:00.000Z' },
        ],
      },
    };

    const workCenters = new Map<string, WorkCenter>();
    workCenters.set('WC-1', workCenter);

    const result = applyShiftAndMaintenanceConstraints(order, workCenters);

    // 9hrs work, 4hr maintenance gap should force end of workOrder to Tuesday
    expect(result.data.startDate).toBe('2026-01-19T08:00:00.000Z');
    expect(result.data.endDate).toBe('2026-01-20T12:00:00.000Z');
  });
});
