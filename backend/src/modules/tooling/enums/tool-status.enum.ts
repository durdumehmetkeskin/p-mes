/**
 * Status of a tool: material-style two-state lifecycle. A tool is either on
 * its rack (available) or checked out to a stage/operator (in_use); custody
 * rides on the status-history rows.
 */
export enum ToolStatus {
  Available = 'available', // kullanıma hazır
  InUse = 'in_use', // kullanımda
}
