import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

/** Set (or clear, when 0) a project's reorder level for a material. */
export class SetProjectMaterialReorderDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  materialId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  reorderLevel: number;
}
