// Domain types (from spec)
export interface WorkOrder {
  docId: string;
  docType: 'workOrder';
  data: {
    workOrderNumber: string;
    manufacturingOrderId: string;
    workCenterId: string;

    // Timing
    startDate: string;
    endDate: string;
    durationMinutes: number;

    // Constraints
    isMaintenance: boolean;

    // Dependencies (can have multiple parents)
    dependsOnWorkOrderIds: string[];
  };
}

export interface Shift {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

export interface MaintenanceWindow {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface WorkCenter {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;
    shifts: Shift[];
    maintenanceWindows: MaintenanceWindow[];
  };
}

export interface ManufacturingOrder {
  docId: string;
  docType: 'manufacturingOrder';
  data: {
    manufacturingOrderNumber: string;
    itemId: string;
    quantity: number;
    dueDate: string;
  };
}

export interface ReflowInput {
  workOrders: WorkOrder[];
  workCenters: WorkCenter[];
  manufacturingOrders: ManufacturingOrder[];
}

export interface ScheduleChange {
  workOrderId: string;
  previousStartDate: string;
  previousEndDate: string;
  newStartDate: string;
  newEndDate: string;
  // need something else here? more detail or explanation?
}

export interface ReflowOutput {
  updatedWorkOrders: WorkOrder[];
  changes: ScheduleChange[];
}

export interface DependencyGraph {
  parentToChildren: Map<string, Set<string>>;
  childToParents: Map<string, Set<string>>;
}
