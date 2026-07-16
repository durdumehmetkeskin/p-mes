import { ReportRecipe } from './report-recipe.enum';

/** The user-facing output format requested at render time. */
export enum ReportFormat {
  Pdf = 'pdf',
  Xlsx = 'xlsx',
  Docx = 'docx',
}

/** Maps a requested format to the jsreport recipe that produces it. */
export const FORMAT_TO_RECIPE: Record<ReportFormat, ReportRecipe> = {
  [ReportFormat.Pdf]: ReportRecipe.ChromePdf,
  [ReportFormat.Xlsx]: ReportRecipe.HtmlToXlsx,
  [ReportFormat.Docx]: ReportRecipe.HtmlEmbeddedInDocx,
};

/** Maps a recipe back to its format (used to label persisted artifacts). */
export const RECIPE_TO_FORMAT: Record<ReportRecipe, ReportFormat> = {
  [ReportRecipe.ChromePdf]: ReportFormat.Pdf,
  [ReportRecipe.HtmlToXlsx]: ReportFormat.Xlsx,
  [ReportRecipe.HtmlEmbeddedInDocx]: ReportFormat.Docx,
};
