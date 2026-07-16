import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/** Reorder a process's stages — sequence is derived from the array order. */
export class ReorderProcessStagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  stageIds: string[];
}
