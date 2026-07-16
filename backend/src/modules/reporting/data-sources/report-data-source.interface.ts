import { ReportDataSource } from '../enums/report-data-source.enum';

/** A single input parameter a data source needs, used to drive the UI form. */
export interface ReportParamField {
  name: string;
  label: string;
  // Tells the frontend which control to render.
  type:
    | 'project'
    | 'order'
    | 'warehouse'
    | 'location'
    | 'user'
    | 'date'
    | 'text';
  required: boolean;
}

/**
 * A report data source: given the user-supplied parameters it returns the plain
 * JSON object fed to the Handlebars template. Each one is a Nest provider so it
 * can inject repositories/services; they are collected into a registry Map.
 */
export interface ReportDataSourceProvider {
  readonly key: ReportDataSource;
  readonly label: string;
  readonly params: ReportParamField[];
  run(params: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** DI token for the array of all registered data-source providers. */
export const REPORT_DATA_SOURCES = Symbol('REPORT_DATA_SOURCES');
