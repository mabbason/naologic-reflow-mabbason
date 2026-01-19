import { describe, it, expect } from 'vitest';
import { buildDependencyGraph, sortByDependencies } from './reflow.service.js';
import type { WorkOrder } from './types.js';

describe('buildDependencyGraph', () => {
  it('builds depGraph for A -> B -> C chain', () => {
    const orderA: WorkOrder = {
      docId: 'A',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-A',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T08:00:00Z',
        endDate: '2026-01-20T09:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const orderB: WorkOrder = {
      docId: 'B',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-B',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T09:00:00Z',
        endDate: '2026-01-20T10:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ['A'],
      },
    };

    const orderC: WorkOrder = {
      docId: 'C',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-C',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T10:00:00Z',
        endDate: '2026-01-20T11:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ['B'],
      },
    };

    const depGraph = buildDependencyGraph([orderA, orderB, orderC]);

    expect(depGraph.childToParents.get('A')).toEqual(new Set([]));
    expect(depGraph.childToParents.get('B')).toEqual(new Set(['A']));
    expect(depGraph.childToParents.get('C')).toEqual(new Set(['B']));

    expect(depGraph.parentToChildren.get('A')).toEqual(new Set(['B']));
    expect(depGraph.parentToChildren.get('B')).toEqual(new Set(['C']));
  });
});

describe('sortByDependencies', () => {
  it('sorts A -> B -> C chain in dependency order', () => {
    const orderA: WorkOrder = {
      docId: 'A',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-A',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T08:00:00Z',
        endDate: '2026-01-20T09:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    };

    const orderB: WorkOrder = {
      docId: 'B',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-B',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T09:00:00Z',
        endDate: '2026-01-20T10:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ['A'],
      },
    };

    const orderC: WorkOrder = {
      docId: 'C',
      docType: 'workOrder',
      data: {
        workOrderNumber: 'WO-C',
        manufacturingOrderId: 'MO-1',
        workCenterId: 'WC-1',
        startDate: '2026-01-20T10:00:00Z',
        endDate: '2026-01-20T11:00:00Z',
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ['B'],
      },
    };

    const workOrders = [orderC, orderB, orderA];
    const depGraph = buildDependencyGraph(workOrders);
    const sorted = sortByDependencies(depGraph, workOrders);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]!.docId).toBe('A');
    expect(sorted[1]!.docId).toBe('B');
    expect(sorted[2]!.docId).toBe('C');
  });
});
