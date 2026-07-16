/** What a file attachment belongs to. */
export enum AttachmentOwnerType {
  Project = 'project',
  Process = 'process',
  Stage = 'stage',
  // A stage's input/output DOCUMENTS (a stage can take/produce products,
  // documents, or both — products link via the Product entity instead).
  // ownerId is a ProcessStage id for both.
  StageInput = 'stage_input',
  StageOutput = 'stage_output',
}
