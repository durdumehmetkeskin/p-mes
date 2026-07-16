/** Lifecycle status of a tool/equipment item. */
export enum ToolStatus {
  Available = 'available', // kullanıma hazır
  InUse = 'in_use', // kullanımda
  Maintenance = 'maintenance', // bakımda
  Calibration = 'calibration', // kalibrasyonda
  Retired = 'retired', // hurda/devre dışı
}
