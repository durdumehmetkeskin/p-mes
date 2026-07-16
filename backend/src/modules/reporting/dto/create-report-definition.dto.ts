import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { ReportRecipe } from '../enums/report-recipe.enum';

export class CreateReportDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_-]*$/, {
    message: 'key must be a lowercase slug (letters, digits, - and _)',
  })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ReportDataSource)
  dataSource: ReportDataSource;

  @IsOptional()
  @IsEnum(ReportRecipe)
  recipe?: ReportRecipe;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  engine?: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  helpers?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
