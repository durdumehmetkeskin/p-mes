import { IsObject, IsOptional } from 'class-validator';

export class RenderReportDto {
  // Free-form parameters validated per data source (e.g. { projectId }).
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
