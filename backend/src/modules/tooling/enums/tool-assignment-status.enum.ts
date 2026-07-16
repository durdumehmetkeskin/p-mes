/** Lifecycle of a tool assignment (checkout). */
export enum ToolAssignmentStatus {
  Active = 'active', // currently checked out
  Returned = 'returned', // checked back in
}
