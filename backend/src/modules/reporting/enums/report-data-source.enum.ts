/**
 * The aggregation query that feeds a report. A report definition's `dataSource`
 * decides which provider runs (see data-sources/) and therefore which input
 * parameters the report expects.
 */
export enum ReportDataSource {
  ProjectProduction = 'project-production',
  WorkOrder = 'work-order',
  Workload = 'workload',
  InventoryTooling = 'inventory-tooling',
  LocationStatus = 'location-status',
  // Detailed, business-grade reports (richer supersets of the four above).
  ProjectReport = 'project-report',
  OrderReport = 'order-report',
  LocationReport = 'location-report',
  PersonnelReport = 'personnel-report',
}
