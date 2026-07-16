/**
 * The jsreport recipe (print technique) used to render a template:
 *  - chrome-pdf           → HTML to PDF via headless Chromium
 *  - html-to-xlsx         → an HTML <table> to an Excel sheet
 *  - html-embedded-in-docx → HTML embedded into a Word .docx document
 */
export enum ReportRecipe {
  ChromePdf = 'chrome-pdf',
  HtmlToXlsx = 'html-to-xlsx',
  HtmlEmbeddedInDocx = 'html-embedded-in-docx',
}
