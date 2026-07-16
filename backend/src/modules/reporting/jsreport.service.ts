import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ReportRecipe } from './enums/report-recipe.enum';

// jsreport packages are CommonJS and ship limited type declarations; require()
// keeps the import simple and avoids ESM/interop friction under Nest's CJS build.
/* eslint-disable @typescript-eslint/no-require-imports */
const jsreport = require('@jsreport/jsreport-core');
const handlebars = require('@jsreport/jsreport-handlebars');
const chromePdf = require('@jsreport/jsreport-chrome-pdf');
const htmlToXlsx = require('@jsreport/jsreport-html-to-xlsx');
const htmlEmbeddedInDocx = require('@jsreport/jsreport-html-embedded-in-docx');
/* eslint-enable @typescript-eslint/no-require-imports */

export interface RenderInput {
  content: string;
  engine: string;
  recipe: ReportRecipe;
  helpers?: string | null;
  data: unknown;
}

export interface RenderResult {
  buffer: Buffer;
  contentType: string;
  fileExtension: string;
}

/**
 * Embeds the jsreport rendering core in-process. A single shared instance is
 * created once at startup (Chromium is kept warm via the default chrome pool)
 * and reused for every render — concurrent renders are dispatched to the worker
 * pool. Templates are passed inline; nothing is written to jsreport's store.
 */
@Injectable()
export class JsReportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JsReportService.name);

  private instance: any;
  private ready: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    this.ready = this.bootstrap();
    await this.ready;
  }

  private async bootstrap(): Promise<void> {
    const isProd = process.env.NODE_ENV === 'production';
    // --no-sandbox is required when Chromium runs as root in Linux containers;
    // on Windows/macOS dev it works without extra flags.
    const launchOptions: Record<string, unknown> = isProd
      ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
      : {};
    // In containers we install a system Chromium and point puppeteer at it
    // (PUPPETEER_SKIP_DOWNLOAD avoids the bundled download). Locally this env
    // is unset and puppeteer uses its own Chromium.
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    this.instance = jsreport({ reportTimeout: 60000 });
    this.instance.use(handlebars());
    this.instance.use(chromePdf({ launchOptions }));
    // html-to-xlsx launches its OWN Chrome (separate from chrome-pdf's pool),
    // so it needs the same launch options (--no-sandbox + executablePath) or it
    // fails as root in a container.
    this.instance.use(htmlToXlsx({ chrome: { launchOptions } }));
    // Embeds the rendered HTML into a Word .docx (no Chrome needed — it wraps
    // the HTML in WordprocessingML). Word's inline-HTML support is limited, so
    // gradients/flex layouts degrade to plain text + tables in the document.
    this.instance.use(htmlEmbeddedInDocx());
    await this.instance.init();
    this.logger.log('jsreport engine initialised');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.instance) {
      await this.instance.close().catch(() => undefined);
    }
  }

  async render(input: RenderInput): Promise<RenderResult> {
    if (this.ready) await this.ready;
    const res = await this.instance.render({
      template: {
        content: input.content,
        engine: input.engine || 'handlebars',
        recipe: input.recipe,
        // jsreport runs the engine in a worker, so helpers must be a STRING of
        // JS (function declarations) — it is serialised across the boundary.
        helpers: input.helpers ?? undefined,
        // Print CSS backgrounds (colors/gradients/charts) and add a page footer.
        // Ignored by the html-to-xlsx recipe.
        chrome: {
          printBackground: true,
          marginTop: '14mm',
          marginBottom: '16mm',
          marginLeft: '12mm',
          marginRight: '12mm',
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate:
            '<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 12mm;display:flex;justify-content:space-between;">' +
            '<span>QUA-MES</span><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        },
      },
      data: input.data,
    });
    return {
      buffer: res.content,
      contentType: res.meta.contentType,
      fileExtension: res.meta.fileExtension,
    };
  }
}
