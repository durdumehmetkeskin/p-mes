import { ReportDataSource } from '../enums/report-data-source.enum';
import { ReportRecipe } from '../enums/report-recipe.enum';

/**
 * Default (system) report templates seeded on first run and refreshed by the
 * seeder. They are stored as editable DB rows (report_definitions). Each one is
 * a professional, chart-rich dashboard: a gradient banner, KPI cards, a donut
 * + bar chart panel (pure CSS — conic-gradient + sized divs, so they render in
 * chrome-pdf with no external assets), and a styled data table. The data table
 * is also what the html-to-xlsx recipe extracts for the Excel export.
 */

const THEME = `
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; margin: 0; color: #0f172a; font-size: 12px; }
  .banner {
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    color: #fff; border-radius: 14px; padding: 22px 26px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .banner h1 { margin: 0; font-size: 23px; font-weight: 700; letter-spacing: .2px; }
  .banner .sub { margin-top: 5px; font-size: 13px; opacity: .92; }
  .banner .meta { margin-top: 12px; font-size: 11px; opacity: .82; }
  .banner .hero { text-align: right; flex: 0 0 auto; padding-left: 20px; }
  .banner .hero .num { font-size: 42px; font-weight: 800; line-height: 1; }
  .banner .hero .cap { font-size: 10px; opacity: .9; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid var(--accent); border-radius: 10px; padding: 12px 14px; }
  .kpi .num { font-size: 21px; font-weight: 700; color: #0f172a; }
  .kpi .lbl { font-size: 10px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: .5px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .panel h3 { margin: 0 0 14px; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: .6px; }
  .donut-wrap { display: flex; align-items: center; gap: 18px; }
  .donut { width: 128px; height: 128px; border-radius: 50%; position: relative; flex: 0 0 auto; }
  .donut .hole { position: absolute; inset: 19px; background: #fff; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .donut .hole .big { font-size: 25px; font-weight: 800; color: #0f172a; }
  .donut .hole .cap { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
  .legend { font-size: 12px; flex: 1; }
  .legend .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .legend .sw { width: 11px; height: 11px; border-radius: 3px; flex: 0 0 auto; }
  .legend .val { margin-left: auto; font-weight: 700; color: #0f172a; }
  .bars .bar-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 11px; }
  .bars .bar-label { width: 92px; flex: 0 0 auto; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bars .bar-track { flex: 1; height: 14px; background: #f1f5f9; border-radius: 7px; overflow: hidden; }
  .bars .bar-fill { height: 100%; border-radius: 7px; }
  .bars .bar-val { width: 46px; text-align: right; flex: 0 0 auto; font-weight: 700; color: #334155; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 6px 0 9px; display: flex; align-items: center; gap: 9px; }
  .section-title::before { content: ''; width: 4px; height: 16px; background: var(--accent); border-radius: 2px; display: inline-block; }
  table.data { border-collapse: collapse; width: 100%; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  table.data thead th { background: var(--accent); color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
  table.data tbody td { padding: 7px 10px; border-top: 1px solid #eef2f7; }
  table.data tbody tr:nth-child(even) { background: #f8fafc; }
  .muted { color: #64748b; }
  .empty { padding: 24px; text-align: center; color: #94a3b8; background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; }
  .letterhead {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin: 0 0 16px; padding-bottom: 12px; border-bottom: 3px solid var(--accent);
  }
  .letterhead img { height: 84px; }
  .letterhead .stamp { text-align: right; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.4px; }
  .letterhead .stamp .sys { display: block; font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 2px; }
</style>`;

// Letterhead on every report: the company logo (injected into the render data
// as `logoDataUri` by ReportRenderService) sits large on the left, tied to the
// template's theme by the accent-colored rule underneath. Custom templates
// that omit the token get a fallback header prepended at render time instead.
const LETTERHEAD = `
<div class="letterhead">
  <img src="{{{logoDataUri}}}" alt="Quanta Kompozit A.Ş." />
  <div class="stamp"><span class="sys">QUA-MES</span>Üretim Yönetim Sistemi</div>
</div>`;

function wrap(accent: string, accentDark: string, body: string): string {
  return `${THEME}
<style>:root{ --accent:${accent}; --accent-dark:${accentDark}; }</style>
${LETTERHEAD}
${body}`;
}

// Reusable donut panel: segments = an array of {label,value,color}.
const donutPanel = (
  title: string,
  segmentsExpr: string,
  bigExpr: string,
  cap: string,
) => `
  <div class="panel">
    <h3>${title}</h3>
    <div class="donut-wrap">
      <div class="donut" style="background:{{{conicGradient ${segmentsExpr}}}}">
        <div class="hole"><span class="big">${bigExpr}</span><span class="cap">${cap}</span></div>
      </div>
      <div class="legend">
        {{#each ${segmentsExpr}}}
          <div class="row"><span class="sw" style="background:{{color}}"></span><span>{{label}}</span><span class="val">{{formatNumber value}}</span></div>
        {{/each}}
      </div>
    </div>
  </div>`;

// Reusable percentage-bar panel for [{label,value}] (value is a 0..100 pct).
const pctBarsPanel = (title: string, itemsExpr: string, emptyMsg: string) => `
  <div class="panel">
    <h3>${title}</h3>
    <div class="bars">
      {{#each ${itemsExpr}}}
        <div class="bar-row">
          <span class="bar-label" title="{{label}}">{{label}}</span>
          <div class="bar-track"><div class="bar-fill" style="width:{{barWidth value 100}};background:{{barColor value}}"></div></div>
          <span class="bar-val">{{percent value}}</span>
        </div>
      {{else}}
        <p class="muted">${emptyMsg}</p>
      {{/each}}
    </div>
  </div>`;

// Reusable count-bar panel for [{label,value,pct,color}] (pct is the 0..100
// bar width, precomputed in the data source so it survives the each scope).
const countBarsPanel = (title: string, itemsExpr: string, emptyMsg: string) => `
  <div class="panel">
    <h3>${title}</h3>
    <div class="bars">
      {{#each ${itemsExpr}}}
        <div class="bar-row">
          <span class="bar-label" title="{{label}}">{{label}}</span>
          <div class="bar-track"><div class="bar-fill" style="width:{{pct}}%;background:{{color}}"></div></div>
          <span class="bar-val">{{formatNumber value}}</span>
        </div>
      {{else}}
        <p class="muted">${emptyMsg}</p>
      {{/each}}
    </div>
  </div>`;

const PROJECT_PRODUCTION = wrap(
  '#2563eb',
  '#1e3a8a',
  `
<div class="banner">
  <div>
    <h1>Üretim Raporu</h1>
    <div class="sub">{{project.name}} · {{defaultTo project.code "-"}}</div>
    <div class="meta">Müşteri: {{defaultTo project.customer "-"}} &nbsp;·&nbsp; Yönetici: {{defaultTo project.manager "-"}} &nbsp;·&nbsp; {{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{percent summary.completionPct}}</div><div class="cap">Tamamlanma</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.totalOrders}}</div><div class="lbl">Sipariş</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalProcesses}}</div><div class="lbl">Süreç</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalStages}}</div><div class="lbl">Aşama</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalDurationHours}}</div><div class="lbl">Toplam Saat</div></div>
</div>

<div class="grid2">
  ${donutPanel('Aşama Durumu', 'charts.stageStatus', '{{formatNumber summary.totalStages}}', 'Aşama')}
  ${pctBarsPanel('Sipariş Bazında Tamamlanma', 'charts.orderCompletion', 'Sipariş bulunamadı.')}
</div>

<div class="section-title">Aşama Detayları</div>
{{#if summary.totalStages}}
<table class="data">
  <thead><tr><th>Sipariş</th><th>Süreç</th><th>#</th><th>Aşama</th><th>Durum</th><th>Sorumlu</th><th>Başlama</th><th>Bitiş</th><th>Süre (s)</th></tr></thead>
  <tbody>
    {{#each orders}}{{#each processes}}{{#each stages}}
      <tr>
        <td>{{../../orderNumber}}</td>
        <td>{{defaultTo ../category "-"}}</td>
        <td>{{sequence}}</td>
        <td>{{name}}</td>
        <td>{{{statusBadge status}}}</td>
        <td>{{defaultTo responsible "-"}}</td>
        <td>{{formatDate startedAt}}</td>
        <td>{{formatDate completedAt}}</td>
        <td>{{formatNumber durationHours}}</td>
      </tr>
    {{/each}}{{/each}}{{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu projede aşama bulunmuyor.</div>{{/if}}
`,
);

const WORK_ORDER = wrap(
  '#7c3aed',
  '#5b21b6',
  `
<div class="banner">
  <div>
    <h1>İş Emri Raporu</h1>
    <div class="sub">{{order.orderNumber}}{{#if order.name}} · {{order.name}}{{/if}}</div>
    <div class="meta">Proje: {{defaultTo order.project "-"}} ({{defaultTo order.projectCode "-"}}) &nbsp;·&nbsp; Termin: {{formatDate order.dueDate}} &nbsp;·&nbsp; {{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{percent summary.completionPct}}</div><div class="cap">Tamamlanma</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.totalProcesses}}</div><div class="lbl">Süreç</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalStages}}</div><div class="lbl">Aşama</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.completedStages}}</div><div class="lbl">Tamamlanan</div></div>
</div>

<div class="grid2">
  ${donutPanel('Aşama Durumu', 'charts.stageStatus', '{{percent summary.completionPct}}', 'Tamamlanma')}
  ${pctBarsPanel('Süreç Bazında Tamamlanma', 'charts.processCompletion', 'Süreç bulunamadı.')}
</div>

<div class="section-title">Aşama Detayları</div>
{{#if summary.totalStages}}
<table class="data">
  <thead><tr><th>Süreç</th><th>#</th><th>Aşama</th><th>Durum</th><th>Sorumlu</th><th>Başlama</th><th>Bitiş</th><th>Süre (s)</th></tr></thead>
  <tbody>
    {{#each processes}}{{#each stages}}
      <tr>
        <td>{{defaultTo ../category "-"}}</td>
        <td>{{sequence}}</td>
        <td>{{name}}</td>
        <td>{{{statusBadge status}}}</td>
        <td>{{defaultTo responsible "-"}}</td>
        <td>{{formatDate startedAt}}</td>
        <td>{{formatDate completedAt}}</td>
        <td>{{formatNumber durationHours}}</td>
      </tr>
    {{/each}}{{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu iş emrinde aşama bulunmuyor.</div>{{/if}}
`,
);

const WORKLOAD = wrap(
  '#0d9488',
  '#0f766e',
  `
<div class="banner">
  <div>
    <h1>İş Yükü Raporu</h1>
    <div class="sub">Kullanıcı bazında atanmış aşamalar</div>
    <div class="meta">Dönem: {{defaultTo from "tümü"}} – {{defaultTo to "tümü"}} &nbsp;·&nbsp; {{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{formatNumber summary.itemCount}}</div><div class="cap">Toplam Görev</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.userCount}}</div><div class="lbl">Kullanıcı</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.completed}}</div><div class="lbl">Tamamlanan</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.inProgress}}</div><div class="lbl">Devam Eden</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.pending}}</div><div class="lbl">Bekleyen</div></div>
</div>

<div class="grid2">
  ${donutPanel('Görev Durumu', 'charts.statusDist', '{{formatNumber summary.itemCount}}', 'Görev')}
  ${countBarsPanel('Kullanıcı Bazında Yük', 'charts.userLoad', 'Görev bulunamadı.')}
</div>

<div class="section-title">Görev Detayları</div>
{{#if summary.itemCount}}
<table class="data">
  <thead><tr><th>Kullanıcı</th><th>Proje</th><th>Sipariş</th><th>Görev</th><th>Durum</th><th>Başlangıç</th><th>Bitiş</th></tr></thead>
  <tbody>
    {{#each users}}{{#each items}}
      <tr>
        <td>{{../userName}}</td>
        <td>{{defaultTo projectName "-"}}</td>
        <td>{{defaultTo orderNumber "-"}}</td>
        <td>{{title}}</td>
        <td>{{{statusBadge status}}}</td>
        <td>{{formatDate start}}</td>
        <td>{{formatDate end}}</td>
      </tr>
    {{/each}}{{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Seçilen dönemde görev bulunmuyor.</div>{{/if}}
`,
);

const INVENTORY_TOOLING = wrap(
  '#ea580c',
  '#9a3412',
  `
<div class="banner">
  <div>
    <h1>Envanter ve Takım Raporu</h1>
    <div class="sub">Stok seviyeleri ve takım ömür durumu</div>
    <div class="meta">{{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{formatNumber summary.lowStockCount}}</div><div class="cap">Düşük Stok</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.materialBalances}}</div><div class="lbl">Stok Kaydı</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.lowStockCount}}</div><div class="lbl">Düşük Stok</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.toolCount}}</div><div class="lbl">Takım</div></div>
</div>

<div class="grid2">
  ${donutPanel('Stok Sağlığı', 'charts.stockHealth', '{{formatNumber summary.materialBalances}}', 'Kayıt')}
  ${donutPanel('Takım Durumu', 'charts.toolStatus', '{{formatNumber summary.toolCount}}', 'Takım')}
</div>

<div class="section-title">Stok Seviyeleri</div>
{{#if summary.materialBalances}}
<table class="data">
  <thead><tr><th>Kod</th><th>Malzeme</th><th>Depo</th><th>Raf</th><th>Mevcut</th><th>Rezerve</th><th>Kullanılabilir</th><th>Sipariş Sev.</th></tr></thead>
  <tbody>
    {{#each stock}}
      <tr>
        <td>{{defaultTo code "-"}}</td>
        <td>{{defaultTo material "-"}}</td>
        <td>{{defaultTo warehouse "-"}}</td>
        <td>{{defaultTo rack "-"}}</td>
        <td>{{formatNumber currentStock}}</td>
        <td>{{formatNumber reservedStock}}</td>
        <td>{{formatNumber availableStock}}</td>
        <td>{{formatNumber reorderLevel}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Stok kaydı bulunmuyor.</div>{{/if}}

<div class="section-title" style="margin-top:16px;">Takımlar</div>
{{#if summary.toolCount}}
<table class="data">
  <thead><tr><th>Kod</th><th>Ad</th><th>Kategori</th><th>Durum</th><th>Tip</th><th>Adet</th></tr></thead>
  <tbody>
    {{#each tools}}
      <tr>
        <td>{{code}}</td>
        <td>{{name}}</td>
        <td>{{category}}</td>
        <td>{{status}}</td>
        <td>{{defaultTo type "-"}}</td>
        <td>{{formatNumber quantity}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Takım kaydı bulunmuyor.</div>{{/if}}
`,
);

// Inline colored status pill driven by a precomputed {label,color} on the row.
const inlinePill = (labelExpr: string, colorExpr: string) =>
  `<span style="display:inline-block;padding:1px 9px;border-radius:999px;font-size:10px;font-weight:600;color:#fff;white-space:nowrap;background:${colorExpr}">${labelExpr}</span>`;

const LOCATION_STATUS = wrap(
  '#0891b2',
  '#155e75',
  `
<div class="banner">
  <div>
    <h1>Lokasyon Durum Raporu</h1>
    <div class="sub">{{location.name}} · {{defaultTo location.code "-"}}</div>
    <div class="meta">
      Durum: {{#if location.isActive}}Aktif{{else}}Pasif{{/if}}
      &nbsp;·&nbsp; Kayıt Aralığı: {{defaultTo (formatDate summary.firstReadingAt) "-"}} – {{defaultTo (formatDate summary.lastReadingAt) "-"}}
      &nbsp;·&nbsp; {{formatDateTime generatedAt}}
    </div>
  </div>
  <div class="hero"><div class="num">{{formatNumber summary.occupiedCount}}/{{formatNumber summary.sectionCount}}</div><div class="cap">Dolu Bölüm</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.sectionCount}}</div><div class="lbl">Bölüm</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.activeReservations}}</div><div class="lbl">Aktif Rezervasyon</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.reservationCount}}</div><div class="lbl">Toplam Rezervasyon</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalReadingCount}}</div><div class="lbl">Sensör Okuması</div></div>
</div>

<div class="grid2">
  ${donutPanel('Bölüm Doluluğu', 'charts.sectionOccupancy', '{{formatNumber summary.occupiedCount}}', 'Dolu')}
  ${donutPanel('Rezervasyon Durumu', 'charts.reservationStatus', '{{formatNumber summary.activeReservations}}', 'Aktif')}
</div>

<div class="grid2">
  <div class="panel">
    <h3>Ortam Koşulları</h3>
    <div style="font-size:11px;">
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7;">
        <span class="muted">Sıcaklık (°C)</span>
        <span style="font-weight:700;">Min {{defaultTo (formatNumber summary.tempMin) "-"}} &nbsp;·&nbsp; Ort {{defaultTo (formatNumber summary.tempAvg) "-"}} &nbsp;·&nbsp; Maks {{defaultTo (formatNumber summary.tempMax) "-"}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7;">
        <span class="muted">Nem (%)</span>
        <span style="font-weight:700;">Min {{defaultTo (formatNumber summary.humidityMin) "-"}} &nbsp;·&nbsp; Ort {{defaultTo (formatNumber summary.humidityAvg) "-"}} &nbsp;·&nbsp; Maks {{defaultTo (formatNumber summary.humidityMax) "-"}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7;">
        <span class="muted">Seçilen Dönem Okuması</span>
        <span style="font-weight:700;">{{formatNumber summary.readingCount}}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:7px 0;">
        <span class="muted">Veri Dosyası</span>
        <span style="font-weight:700;">{{formatNumber summary.fileCount}}</span>
      </div>
    </div>
  </div>
  <div class="panel">
    <h3>Doluluk Özeti</h3>
    <div class="bars">
      <div class="bar-row"><span class="bar-label">Dolu Bölüm</span><div class="bar-track"><div class="bar-fill" style="width:{{barWidth summary.occupiedCount summary.sectionCount}};background:#dc2626"></div></div><span class="bar-val">{{formatNumber summary.occupiedCount}}</span></div>
      <div class="bar-row"><span class="bar-label">Boş Bölüm</span><div class="bar-track"><div class="bar-fill" style="width:{{barWidth summary.freeCount summary.sectionCount}};background:#16a34a"></div></div><span class="bar-val">{{formatNumber summary.freeCount}}</span></div>
      <div class="bar-row"><span class="bar-label">Aktif Rez.</span><div class="bar-track"><div class="bar-fill" style="width:{{barWidth summary.activeReservations summary.reservationCount}};background:#f59e0b"></div></div><span class="bar-val">{{formatNumber summary.activeReservations}}</span></div>
      <div class="bar-row"><span class="bar-label">Yaklaşan Rez.</span><div class="bar-track"><div class="bar-fill" style="width:{{barWidth summary.upcomingReservations summary.reservationCount}};background:#2563eb"></div></div><span class="bar-val">{{formatNumber summary.upcomingReservations}}</span></div>
    </div>
  </div>
</div>

<div class="section-title">Bölümler</div>
{{#if summary.sectionCount}}
<table class="data">
  <thead><tr><th>Kod</th><th>Ad</th><th>Durum</th><th>Mevcut Sipariş</th><th>Aktif</th></tr></thead>
  <tbody>
    {{#each sections}}
      <tr>
        <td>{{code}}</td>
        <td>{{name}}</td>
        <td>${inlinePill('{{pillLabel}}', '{{pillColor}}')}</td>
        <td>{{defaultTo currentOrder "-"}}</td>
        <td>{{#if isActive}}Evet{{else}}Hayır{{/if}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu lokasyonda bölüm bulunmuyor.</div>{{/if}}

<div class="section-title" style="margin-top:16px;">Rezervasyonlar</div>
{{#if summary.reservationCount}}
<table class="data">
  <thead><tr><th>Sipariş</th><th>Bölüm</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th><th>Not</th></tr></thead>
  <tbody>
    {{#each reservations}}
      <tr>
        <td>{{defaultTo orderNumber "-"}}{{#if orderName}} · {{orderName}}{{/if}}</td>
        <td>{{defaultTo section "-"}}</td>
        <td>{{formatDate startDate}}</td>
        <td>{{formatDate endDate}}</td>
        <td>${inlinePill('{{pillLabel}}', '{{pillColor}}')}</td>
        <td>{{defaultTo note "-"}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu lokasyonda rezervasyon bulunmuyor.</div>{{/if}}

<div class="section-title" style="margin-top:16px;">Son Sensör Okumaları</div>
{{#if readings.length}}
<table class="data">
  <thead><tr><th>Zaman</th><th>Sıcaklık (°C)</th><th>Nem (%)</th></tr></thead>
  <tbody>
    {{#each readings}}
      <tr>
        <td>{{formatDateTime recordedAt}}</td>
        <td>{{formatNumber temperature}}</td>
        <td>{{formatNumber humidity}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Sensör okuması bulunmuyor.</div>{{/if}}

{{#if summary.fileCount}}
<div class="section-title" style="margin-top:16px;">Veri Dosyaları</div>
<table class="data">
  <thead><tr><th>Dosya</th><th>Okuma</th><th>Başlangıç</th><th>Bitiş</th></tr></thead>
  <tbody>
    {{#each files}}
      <tr>
        <td>{{fileName}}</td>
        <td>{{formatNumber readingCount}}</td>
        <td>{{formatDateTime startTime}}</td>
        <td>{{formatDateTime endTime}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}
`,
);

// ---------------------------------------------------------------------------
// Detailed business-grade reports (Proje / Sipariş Emri / Lokasyon / Personel).
// They reuse the shared THEME + donut/bar partials and add two new pure-CSS/SVG
// building blocks: a temperature/humidity line chart (precomputed SVG paths)
// and a reservation/occupancy Gantt timeline (precomputed left/width %).
// ---------------------------------------------------------------------------

const DETAIL_STYLES = `
<style>
  .kpis.k3 { grid-template-columns: repeat(3, 1fr); }
  .kpis.k5 { grid-template-columns: repeat(5, 1fr); }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; font-size: 11px; }
  .info .row { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid #eef2f7; }
  .info .row .k { color: #64748b; }
  .info .row .v { font-weight: 600; color: #0f172a; text-align: right; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; color: #fff; white-space: nowrap; }
  .chart-meta { font-size: 11px; color: #475569; margin-bottom: 6px; }
  .chart-meta b { color: #0f172a; }
  svg.linechart { width: 100%; height: auto; display: block; }
  .gantt { font-size: 10px; }
  .gaxis { display: flex; height: 13px; margin-bottom: 4px; }
  .gpad { flex: 0 0 130px; }
  .garea { position: relative; flex: 1; }
  .garea .gt { position: absolute; transform: translateX(-50%); top: 0; font-size: 9px; color: #94a3b8; white-space: nowrap; }
  .grow { display: flex; align-items: center; margin: 3px 0; }
  .glbl { flex: 0 0 130px; padding-right: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
  .glbl .gsub { color: #94a3b8; }
  .gtrack { position: relative; flex: 1; height: 17px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 4px; }
  .ggrid { position: absolute; top: 0; bottom: 0; width: 1px; background: #eef2f7; }
  .gbar { position: absolute; top: 2px; bottom: 2px; border-radius: 3px; min-width: 2px; }
  .occ { display: flex; gap: 2px; }
  .occ .cell { flex: 1 1 0; height: 26px; border-radius: 2px; }
  .occ-axis { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 5px; }
</style>`;

// A single-metric temperature/humidity line chart panel. `path` is the context
// key holding the precomputed SeriesChart (see report-geometry.ts).
const lineChartPanel = (title: string, path: string, unit: string) => `
  <div class="panel" style="margin-bottom:12px;">
    <h3>${title}</h3>
    {{#with ${path}}}
      {{#if hasData}}
        <div class="chart-meta">Min <b>{{formatNumber min}}${unit}</b> &nbsp;·&nbsp; Ortalama <b>{{formatNumber avg}}${unit}</b> &nbsp;·&nbsp; Maks <b>{{formatNumber max}}${unit}</b> &nbsp;·&nbsp; {{formatNumber pointCount}} ölçüm noktası</div>
        <svg class="linechart" viewBox="0 0 {{w}} {{h}}" preserveAspectRatio="xMidYMid meet">
          {{#each yTicks}}
            <line x1="{{../plotLeft}}" y1="{{y}}" x2="{{../plotRight}}" y2="{{y}}" stroke="#e2e8f0" stroke-width="0.7" />
            <text x="{{sub ../plotLeft 6}}" y="{{add y 3}}" text-anchor="end" font-size="10" fill="#94a3b8">{{label}}</text>
          {{/each}}
          {{#each xTicks}}
            <text x="{{x}}" y="{{add ../plotBottom 16}}" text-anchor="middle" font-size="9" fill="#94a3b8">{{label}}</text>
          {{/each}}
          {{#if bandPath}}<polygon points="{{bandPath}}" fill="{{color}}" fill-opacity="0.12" />{{/if}}
          <polyline points="{{linePath}}" fill="none" stroke="{{color}}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
      {{else}}
        <div class="empty">Seçilen aralıkta ölçüm verisi bulunamadı.</div>
      {{/if}}
    {{/with}}
  </div>`;

// A reservation / occupancy Gantt. `path` holds the precomputed Timeline.
const ganttPanel = (title: string, path: string, emptyMsg: string) => `
  <div class="panel">
    <h3>${title}</h3>
    {{#with ${path}}}
      {{#if hasData}}
        <div class="gantt">
          <div class="gaxis">
            <div class="gpad"></div>
            <div class="garea">
              {{#each ticks}}<span class="gt" style="left:{{leftPct}}%">{{label}}</span>{{/each}}
            </div>
          </div>
          {{#each items}}
            <div class="grow">
              <div class="glbl" title="{{label}}">{{label}}{{#if sublabel}} <span class="gsub">{{sublabel}}</span>{{/if}}</div>
              <div class="gtrack">
                {{#each ../ticks}}<span class="ggrid" style="left:{{leftPct}}%"></span>{{/each}}
                {{#if visible}}<span class="gbar" style="left:{{leftPct}}%;width:{{widthPct}}%;background:{{color}}"></span>{{/if}}
              </div>
            </div>
          {{/each}}
        </div>
        {{#if overflow}}<p class="muted" style="margin-top:6px;">+{{formatNumber overflow}} kayıt daha (sayfada gösterilmedi).</p>{{/if}}
      {{else}}
        <div class="empty">${emptyMsg}</div>
      {{/if}}
    {{/with}}
  </div>`;

const PROJECT_REPORT = wrap(
  '#1d4ed8',
  '#172554',
  `
${DETAIL_STYLES}
<div class="banner">
  <div>
    <h1>Proje Raporu</h1>
    <div class="sub">{{project.name}} · {{defaultTo project.code "-"}}</div>
    <div class="meta">Müşteri: {{defaultTo project.customer "-"}} &nbsp;·&nbsp; Yönetici: {{defaultTo project.manager "-"}} &nbsp;·&nbsp; {{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{percent summary.completionPct}}</div><div class="cap">Tamamlanma</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.totalOrders}}</div><div class="lbl">Toplam Sipariş Emri</div></div>
  <div class="kpi" style="border-left-color:#16a34a"><div class="num">{{formatNumber summary.completedOrders}}</div><div class="lbl">Tamamlanan</div></div>
  <div class="kpi" style="border-left-color:#f59e0b"><div class="num">{{formatNumber summary.inProgressOrders}}</div><div class="lbl">Devam Eden</div></div>
  <div class="kpi" style="border-left-color:#94a3b8"><div class="num">{{formatNumber summary.pendingOrders}}</div><div class="lbl">Bekleyen</div></div>
</div>

<div class="grid2">
  <div class="panel">
    <h3>Proje Bilgileri</h3>
    <div class="info">
      <div class="row"><span class="k">Durum</span><span class="v">{{defaultTo project.status "-"}}</span></div>
      <div class="row"><span class="k">İletişim</span><span class="v">{{defaultTo project.contact "-"}}</span></div>
      <div class="row"><span class="k">Başlangıç</span><span class="v">{{defaultTo (formatDate project.startDate) "-"}}</span></div>
      <div class="row"><span class="k">Bitiş</span><span class="v">{{defaultTo (formatDate project.endDate) "-"}}</span></div>
      <div class="row"><span class="k">Süreç</span><span class="v">{{formatNumber summary.totalProcesses}}</span></div>
      <div class="row"><span class="k">Aşama</span><span class="v">{{formatNumber summary.totalStages}}</span></div>
      <div class="row"><span class="k">Toplam Saat</span><span class="v">{{formatNumber summary.totalDurationHours}}</span></div>
      <div class="row"><span class="k">Tamamlanan Süreç</span><span class="v">{{formatNumber summary.completedProcesses}}</span></div>
    </div>
  </div>
  ${donutPanel('Sipariş Emri Durumu', 'charts.orderStatus', '{{formatNumber summary.totalOrders}}', 'Sipariş')}
</div>

<div class="grid2">
  ${pctBarsPanel('Sipariş Bazında Tamamlanma', 'charts.orderCompletion', 'Sipariş bulunamadı.')}
  ${donutPanel('Aşama Durumu', 'charts.stageStatus', '{{percent summary.completionPct}}', 'Tamamlanma')}
</div>

<div class="section-title">Sipariş Emirleri ve Terminler</div>
{{#if orders.length}}
<table class="data">
  <thead><tr><th>Sipariş</th><th>Ad</th><th>Termin</th><th>Plan. Başl.</th><th>Plan. Bitiş</th><th>Fiili Başl.</th><th>Fiili Bitiş</th><th>Durum</th><th>Süreç</th><th>%</th></tr></thead>
  <tbody>
    {{#each orders}}
    <tr>
      <td>{{orderNumber}}</td>
      <td>{{defaultTo name "-"}}</td>
      <td>{{defaultTo (formatDate dueDate) "-"}}</td>
      <td>{{defaultTo (formatDate plannedStart) "-"}}</td>
      <td>{{defaultTo (formatDate plannedEnd) "-"}}</td>
      <td>{{defaultTo (formatDate actualStart) "-"}}</td>
      <td>{{defaultTo (formatDate actualEnd) "-"}}</td>
      <td>{{{statusBadge status}}}</td>
      <td>{{formatNumber completedProcesses}}/{{formatNumber totalProcesses}}</td>
      <td>{{percent completionPct}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu projede sipariş emri bulunmuyor.</div>{{/if}}

<div class="section-title">Süreçler ve Bulundukları Aşama</div>
{{#if summary.totalProcesses}}
<table class="data">
  <thead><tr><th>Sipariş</th><th>Süreç</th><th>Durum</th><th>Bulunduğu Aşama</th><th>Sorumlu</th><th>Aşama</th><th>%</th></tr></thead>
  <tbody>
    {{#each orders}}{{#each processes}}
    <tr>
      <td>{{../orderNumber}}</td>
      <td>{{defaultTo category "-"}}</td>
      <td>{{{statusBadge status}}}</td>
      <td>{{defaultTo currentStageName "Tamamlandı"}}</td>
      <td>{{defaultTo responsible "-"}}</td>
      <td>{{formatNumber completedStages}}/{{formatNumber totalStages}}</td>
      <td>{{percent completionPct}}</td>
    </tr>
    {{/each}}{{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu projede süreç bulunmuyor.</div>{{/if}}

<div class="grid2" style="margin-top:16px;">
  ${donutPanel('Kalıp Konumu (Saha / Depo)', 'charts.moldLocation', '{{formatNumber summary.moldCount}}', 'Kalıp')}
  <div class="panel">
    <h3>Ham Madde ve Kalıp Özeti</h3>
    <div class="info" style="grid-template-columns:1fr;">
      <div class="row"><span class="k">Malzeme Kalemi</span><span class="v">{{formatNumber materialsSummary.totalMaterials}}</span></div>
      <div class="row"><span class="k">Eksiği Olan Kalem</span><span class="v">{{formatNumber materialsSummary.shortageCount}}</span></div>
      <div class="row"><span class="k">Düşük Stoklu Kalem</span><span class="v">{{formatNumber materialsSummary.lowStockCount}}</span></div>
      <div class="row"><span class="k">Sahadaki Kalıp</span><span class="v">{{formatNumber summary.moldsInField}}</span></div>
      <div class="row"><span class="k">Depodaki Kalıp</span><span class="v">{{formatNumber summary.moldsInWarehouse}}</span></div>
    </div>
  </div>
</div>

<div class="section-title">Ham Madde ve Stok Durumu</div>
{{#if materials.length}}
<table class="data">
  <thead><tr><th>Kod</th><th>Malzeme</th><th>İhtiyaç</th><th>Birim</th><th>Anlık Stok</th><th>Sipariş Sev.</th><th>Eksik</th><th>Durum</th></tr></thead>
  <tbody>
    {{#each materials}}
    <tr>
      <td>{{defaultTo code "-"}}</td>
      <td>{{name}}</td>
      <td>{{formatNumber required}}</td>
      <td>{{defaultTo unit "-"}}</td>
      <td>{{#if inStock}}{{formatNumber onHand}}{{else}}<span class="muted">envanterde yok</span>{{/if}}</td>
      <td>{{#if inStock}}{{formatNumber reorderLevel}}{{else}}-{{/if}}</td>
      <td>{{#if (gt shortage 0)}}<b style="color:#dc2626">{{formatNumber shortage}}</b>{{else}}-{{/if}}</td>
      <td>{{#if low}}<span class="pill" style="background:#dc2626">Düşük Stok</span>{{else if (gt shortage 0)}}<span class="pill" style="background:#f59e0b">Eksik</span>{{else}}<span class="pill" style="background:#16a34a">Yeterli</span>{{/if}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu projeye ait ham madde (BOM/MRP) kaydı bulunmuyor.</div>{{/if}}

<div class="section-title" style="margin-top:16px;">Kalıplar (Saha / Depo)</div>
{{#if molds.length}}
<table class="data">
  <thead><tr><th>Kod</th><th>Kalıp</th><th>Konum Durumu</th><th>Konum</th><th>Seri No</th></tr></thead>
  <tbody>
    {{#each molds}}
    <tr>
      <td>{{code}}</td>
      <td>{{name}}</td>
      <td><span class="pill" style="background:{{pillColor}}">{{pillLabel}}</span></td>
      <td>{{location}}</td>
      <td>{{defaultTo serialNumber "-"}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{#unless (eq moldScope "project")}}<p class="muted" style="margin-top:6px;">Bu projeye özel kalıp ataması bulunamadığından tüm kalıplar listelenmiştir.</p>{{/unless}}
{{else}}<div class="empty">Kalıp kaydı bulunmuyor.</div>{{/if}}
`,
);

const ORDER_REPORT = wrap(
  '#6d28d9',
  '#4c1d95',
  `
${DETAIL_STYLES}
<div class="banner">
  <div>
    <h1>Sipariş Emri Raporu</h1>
    <div class="sub">{{order.orderNumber}}{{#if order.name}} · {{order.name}}{{/if}}</div>
    <div class="meta">Proje: {{defaultTo order.project "-"}} ({{defaultTo order.projectCode "-"}}) &nbsp;·&nbsp; Termin: {{defaultTo (formatDate order.dueDate) "-"}} &nbsp;·&nbsp; {{formatDateTime generatedAt}}</div>
  </div>
  <div class="hero"><div class="num">{{percent summary.completionPct}}</div><div class="cap">Tamamlanma</div></div>
</div>

<div class="kpis k5">
  <div class="kpi"><div class="num">{{formatNumber summary.totalProcesses}}</div><div class="lbl">Süreç</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalStages}}</div><div class="lbl">Aşama</div></div>
  <div class="kpi" style="border-left-color:#16a34a"><div class="num">{{formatNumber summary.completedStages}}</div><div class="lbl">Tamamlanan</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.materialLineCount}}</div><div class="lbl">Ham Madde Kalemi</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.locationCount}}</div><div class="lbl">Lokasyon</div></div>
</div>

<div class="grid2">
  ${donutPanel('Aşama Durumu', 'charts.stageStatus', '{{percent summary.completionPct}}', 'Tamamlanma')}
  ${pctBarsPanel('Süreç Bazında Tamamlanma', 'charts.processCompletion', 'Süreç bulunamadı.')}
</div>

<div class="section-title">Kullanılan Ham Maddeler</div>
{{#if materials.length}}
<table class="data">
  <thead><tr><th>Tür</th><th>Kod</th><th>Malzeme</th><th>Miktar</th><th>Birim</th><th>İhtiyaç Tarihi</th><th>Mevcut</th><th>Eksik</th><th>Aşama</th></tr></thead>
  <tbody>
    {{#each materials}}
    <tr>
      <td>{{kind}}</td>
      <td>{{defaultTo code "-"}}</td>
      <td>{{name}}</td>
      <td>{{formatNumber quantity}}</td>
      <td>{{defaultTo unit "-"}}</td>
      <td>{{defaultTo (formatDate date) "-"}}</td>
      <td>{{defaultTo (formatNumber available) "-"}}</td>
      <td>{{#if (gt shortage 0)}}<b style="color:#dc2626">{{formatNumber shortage}}</b>{{else}}-{{/if}}</td>
      <td>{{defaultTo stage "-"}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu sipariş emrinde ham madde (BOM/MRP) kaydı bulunmuyor.</div>{{/if}}

<div class="section-title">Ortam Koşulları (Sıcaklık / Nem)</div>
{{#if environment.length}}
  {{#each environment}}
    <div class="section-title" style="font-size:12px;margin-top:10px;">
      {{defaultTo locationName "Lokasyon"}} &nbsp;·&nbsp; Bölüm {{defaultTo sectionCode "-"}} &nbsp;·&nbsp; {{formatDate from}} – {{formatDate to}} &nbsp;·&nbsp; {{formatNumber readingCount}} ölçüm
    </div>
    ${lineChartPanel('Sıcaklık (°C)', 'tempChart', '°C')}
    ${lineChartPanel('Nem (%)', 'humidityChart', '%')}
  {{/each}}
{{else}}<div class="empty">Bu siparişin yürütüldüğü lokasyon rezervasyonu veya ölçüm verisi bulunamadı.</div>{{/if}}

<div class="section-title">Süreçler (Personel ve Zaman Çizelgesi)</div>
{{#if processes.length}}
<table class="data">
  <thead><tr><th>Süreç</th><th>Durum</th><th>Sorumlu</th><th>Plan. Başl.</th><th>Plan. Bitiş</th><th>Fiili Başl.</th><th>Fiili Bitiş</th><th>Tah. Süre</th><th>Süre (s)</th><th>%</th></tr></thead>
  <tbody>
    {{#each processes}}
    <tr>
      <td>{{defaultTo category "-"}}</td>
      <td>{{{statusBadge status}}}</td>
      <td>{{defaultTo responsible "-"}}</td>
      <td>{{defaultTo (formatDate estimatedStartDate) "-"}}</td>
      <td>{{defaultTo (formatDate estimatedCompletedDate) "-"}}</td>
      <td>{{defaultTo (formatDate startedAt) "-"}}</td>
      <td>{{defaultTo (formatDate completedAt) "-"}}</td>
      <td>{{defaultTo (formatNumber estimatedDurationHours) "-"}}</td>
      <td>{{formatNumber durationHours}}</td>
      <td>{{percent completionPct}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu sipariş emrinde süreç bulunmuyor.</div>{{/if}}

<div class="section-title">Aşamalar (Personel ve Zaman Çizelgesi)</div>
{{#if summary.totalStages}}
<table class="data">
  <thead><tr><th>Süreç</th><th>#</th><th>Aşama</th><th>Durum</th><th>Sorumlu</th><th>Plan. Başl.</th><th>Plan. Bitiş</th><th>Fiili Başl.</th><th>Fiili Bitiş</th><th>Süre (s)</th></tr></thead>
  <tbody>
    {{#each processes}}{{#each stages}}
    <tr>
      <td>{{defaultTo ../category "-"}}</td>
      <td>{{sequence}}</td>
      <td>{{name}}</td>
      <td>{{{statusBadge status}}}</td>
      <td>{{defaultTo responsible "-"}}</td>
      <td>{{defaultTo (formatDate estimatedStartDate) "-"}}</td>
      <td>{{defaultTo (formatDate estimatedCompletedDate) "-"}}</td>
      <td>{{defaultTo (formatDate startedAt) "-"}}</td>
      <td>{{defaultTo (formatDate completedAt) "-"}}</td>
      <td>{{defaultTo (formatNumber durationHours) "-"}}</td>
    </tr>
    {{/each}}{{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Bu sipariş emrinde aşama bulunmuyor.</div>{{/if}}
`,
);

const LOCATION_REPORT = wrap(
  '#0e7490',
  '#155e75',
  `
${DETAIL_STYLES}
<div class="banner">
  <div>
    <h1>Lokasyon Raporu</h1>
    <div class="sub">{{location.name}} · {{defaultTo location.code "-"}}</div>
    <div class="meta">
      Dönem: {{defaultTo (formatDate window.resolvedFrom) "-"}} – {{defaultTo (formatDate window.resolvedTo) "-"}}
      &nbsp;·&nbsp; {{formatNumber summary.readingCount}} ölçüm &nbsp;·&nbsp; {{formatDateTime generatedAt}}
    </div>
  </div>
  <div class="hero"><div class="num">{{defaultTo (formatNumber summary.tempAvg) "-"}}°</div><div class="cap">Ort. Sıcaklık</div></div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">{{formatNumber summary.readingCount}}</div><div class="lbl">Ölçüm</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.occupiedCount}}/{{formatNumber summary.sectionCount}}</div><div class="lbl">Dolu Bölüm</div></div>
  <div class="kpi" style="border-left-color:#f59e0b"><div class="num">{{formatNumber summary.activeReservations}}</div><div class="lbl">Aktif Rezervasyon</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.reservationCount}}</div><div class="lbl">Dönem Rezervasyonu</div></div>
</div>

<div class="grid2">
  <div class="panel">
    <h3>Ortam Özeti</h3>
    <div class="info" style="grid-template-columns:1fr;">
      <div class="row"><span class="k">Sıcaklık (°C)</span><span class="v">Min {{defaultTo (formatNumber summary.tempMin) "-"}} · Ort {{defaultTo (formatNumber summary.tempAvg) "-"}} · Maks {{defaultTo (formatNumber summary.tempMax) "-"}}</span></div>
      <div class="row"><span class="k">Nem (%)</span><span class="v">Min {{defaultTo (formatNumber summary.humidityMin) "-"}} · Ort {{defaultTo (formatNumber summary.humidityAvg) "-"}} · Maks {{defaultTo (formatNumber summary.humidityMax) "-"}}</span></div>
      <div class="row"><span class="k">Boş Bölüm</span><span class="v">{{formatNumber summary.freeCount}}</span></div>
      <div class="row"><span class="k">Yaklaşan Rezervasyon</span><span class="v">{{formatNumber summary.upcomingReservations}}</span></div>
    </div>
  </div>
  ${donutPanel('Rezervasyon Durumu', 'charts.reservationStatus', '{{formatNumber summary.activeReservations}}', 'Aktif')}
</div>

<div class="section-title">Sıcaklık ve Nem Eğrileri</div>
${lineChartPanel('Sıcaklık (°C)', 'tempChart', '°C')}
${lineChartPanel('Nem (%)', 'humidityChart', '%')}

<div class="section-title">Rezervasyon ve Operasyon Takvimi</div>
${ganttPanel('Bölüm Bazında Rezervasyonlar', 'timeline', 'Seçilen dönemde rezervasyon bulunmuyor.')}

<div class="section-title" style="margin-top:16px;">Rezervasyonlar ve Operasyonlar</div>
{{#if reservations.length}}
<table class="data">
  <thead><tr><th>Sipariş</th><th>Bölüm</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th><th>Operasyon</th><th>Aktif Operasyon</th><th>Not</th></tr></thead>
  <tbody>
    {{#each reservations}}
    <tr>
      <td>{{defaultTo orderNumber "-"}}{{#if orderName}} · {{orderName}}{{/if}}</td>
      <td>{{defaultTo section "-"}}</td>
      <td>{{formatDate startDate}}</td>
      <td>{{formatDate endDate}}</td>
      <td><span class="pill" style="background:{{pillColor}}">{{pillLabel}}</span></td>
      <td>{{formatNumber completedOperations}}/{{formatNumber operationCount}}</td>
      <td>{{defaultTo activeOperation "-"}}</td>
      <td>{{defaultTo note "-"}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Seçilen dönemde rezervasyon bulunmuyor.</div>{{/if}}

{{#if readings.length}}
<div class="section-title" style="margin-top:16px;">Son Ölçümler</div>
<table class="data">
  <thead><tr><th>Zaman</th><th>Sıcaklık (°C)</th><th>Nem (%)</th></tr></thead>
  <tbody>
    {{#each readings}}
    <tr><td>{{formatDateTime recordedAt}}</td><td>{{formatNumber temperature}}</td><td>{{formatNumber humidity}}</td></tr>
    {{/each}}
  </tbody>
</table>
{{/if}}
`,
);

const PERSONNEL_REPORT = wrap(
  '#047857',
  '#064e3b',
  `
${DETAIL_STYLES}
<div class="banner">
  <div>
    <h1>Personel Raporu</h1>
    <div class="sub">{{personnel.name}}</div>
    <div class="meta">
      {{defaultTo personnel.email "-"}}{{#if personnel.roles}} &nbsp;·&nbsp; {{personnel.roles}}{{/if}}
      &nbsp;·&nbsp; Dönem: {{defaultTo (formatDate window.from) "tümü"}} – {{defaultTo (formatDate window.to) "tümü"}}
      &nbsp;·&nbsp; {{formatDateTime generatedAt}}
    </div>
  </div>
  <div class="hero"><div class="num">{{formatNumber summary.totalAssigned}}</div><div class="cap">Atanan Görev</div></div>
</div>

<div class="kpis k5">
  <div class="kpi" style="border-left-color:#16a34a"><div class="num">{{formatNumber summary.completed}}</div><div class="lbl">Tamamlanan</div></div>
  <div class="kpi" style="border-left-color:#f59e0b"><div class="num">{{formatNumber summary.inProgress}}</div><div class="lbl">Devam Eden</div></div>
  <div class="kpi" style="border-left-color:#94a3b8"><div class="num">{{formatNumber summary.pending}}</div><div class="lbl">Bekleyen</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.busyDays}}</div><div class="lbl">Dolu Gün</div></div>
  <div class="kpi"><div class="num">{{formatNumber summary.totalHours}}</div><div class="lbl">Toplam Saat</div></div>
</div>

<div class="grid2">
  ${donutPanel('Görev Durumu', 'charts.statusDist', '{{formatNumber summary.totalAssigned}}', 'Görev')}
  <div class="panel">
    <h3>Günlük Doluluk</h3>
    {{#if charts.occupancy.length}}
      <div class="occ">{{#each charts.occupancy}}<div class="cell" style="background:{{color}}" title="{{label}}: {{value}}"></div>{{/each}}</div>
      <div class="occ-axis"><span>{{timeline.windowStartLabel}}</span><span>Dolu gün: {{formatNumber summary.busyDays}}</span><span>{{timeline.windowEndLabel}}</span></div>
    {{else}}<div class="empty">Veri yok.</div>{{/if}}
  </div>
</div>

<div class="section-title">Doluluk Takvimi (Görev Zaman Çizelgesi)</div>
${ganttPanel('Atanan Aşamalar', 'timeline', 'Seçilen dönemde atanmış görev bulunmuyor.')}

<div class="grid2" style="margin-top:4px;">
  ${countBarsPanel('Proje Bazında Yük', 'charts.projectLoad', 'Görev bulunamadı.')}
  <div class="panel">
    <h3>Özet</h3>
    <div class="info" style="grid-template-columns:1fr;">
      <div class="row"><span class="k">Toplam Görev</span><span class="v">{{formatNumber summary.totalAssigned}}</span></div>
      <div class="row"><span class="k">Proje Sayısı</span><span class="v">{{formatNumber summary.projectCount}}</span></div>
      <div class="row"><span class="k">Toplam Saat</span><span class="v">{{formatNumber summary.totalHours}}</span></div>
      <div class="row"><span class="k">Dolu Gün</span><span class="v">{{formatNumber summary.busyDays}}</span></div>
    </div>
  </div>
</div>

<div class="section-title">Tamamlanan Aşamalar</div>
{{#if completedItems.length}}
<table class="data">
  <thead><tr><th>Aşama</th><th>Sipariş</th><th>Proje</th><th>Süreç</th><th>Başlangıç</th><th>Bitiş</th><th>Süre (s)</th></tr></thead>
  <tbody>
    {{#each completedItems}}
    <tr>
      <td>{{name}}</td>
      <td>{{defaultTo orderNumber "-"}}</td>
      <td>{{defaultTo projectName "-"}}</td>
      <td>{{defaultTo processCategory "-"}}</td>
      <td>{{defaultTo (formatDate startedAt) "-"}}</td>
      <td>{{defaultTo (formatDate completedAt) "-"}}</td>
      <td>{{defaultTo (formatNumber durationHours) "-"}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Seçilen dönemde tamamlanan aşama bulunmuyor.</div>{{/if}}

<div class="section-title">Atandığı Tüm Aşamalar</div>
{{#if items.length}}
<table class="data">
  <thead><tr><th>Aşama</th><th>Sipariş</th><th>Proje</th><th>Durum</th><th>Plan. Başl.</th><th>Plan. Bitiş</th><th>Fiili Başl.</th><th>Fiili Bitiş</th></tr></thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{name}}</td>
      <td>{{defaultTo orderNumber "-"}}</td>
      <td>{{defaultTo projectName "-"}}</td>
      <td>{{{statusBadge status}}}</td>
      <td>{{defaultTo (formatDate estimatedStartDate) "-"}}</td>
      <td>{{defaultTo (formatDate estimatedCompletedDate) "-"}}</td>
      <td>{{defaultTo (formatDate startedAt) "-"}}</td>
      <td>{{defaultTo (formatDate completedAt) "-"}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}<div class="empty">Seçilen dönemde atanmış aşama bulunmuyor.</div>{{/if}}
`,
);

export interface DefaultReportDefinition {
  key: string;
  name: string;
  description: string;
  dataSource: ReportDataSource;
  recipe: ReportRecipe;
  content: string;
}

export const DEFAULT_REPORT_DEFINITIONS: DefaultReportDefinition[] = [
  {
    key: 'project-production',
    name: 'Proje Üretim Raporu',
    description:
      'Proje → Sipariş → Süreç → Aşama; durum dağılımı, tamamlanma grafikleri ve detay tablo.',
    dataSource: ReportDataSource.ProjectProduction,
    recipe: ReportRecipe.ChromePdf,
    content: PROJECT_PRODUCTION,
  },
  {
    key: 'work-order',
    name: 'İş Emri Detay Raporu',
    description:
      'Tek sipariş için süreç/aşama durumu, tamamlanma grafikleri ve zaman çizelgesi.',
    dataSource: ReportDataSource.WorkOrder,
    recipe: ReportRecipe.ChromePdf,
    content: WORK_ORDER,
  },
  {
    key: 'workload',
    name: 'İş Yükü Raporu',
    description:
      'Kullanıcı bazında iş yükü dağılımı, görev durumu grafiği ve detay tablo.',
    dataSource: ReportDataSource.Workload,
    recipe: ReportRecipe.ChromePdf,
    content: WORKLOAD,
  },
  {
    key: 'inventory-tooling',
    name: 'Envanter ve Takım Raporu',
    description:
      'Stok sağlığı ve takım durumu donut grafikleri, ömür kullanımı ve detay tablolar.',
    dataSource: ReportDataSource.InventoryTooling,
    recipe: ReportRecipe.ChromePdf,
    content: INVENTORY_TOOLING,
  },
  {
    key: 'location-status',
    name: 'Lokasyon Durum Raporu',
    description:
      'Tek lokasyon için bölüm doluluğu, rezervasyon durumu, ortam koşulları (sıcaklık/nem) ve sensör veri özeti.',
    dataSource: ReportDataSource.LocationStatus,
    recipe: ReportRecipe.ChromePdf,
    content: LOCATION_STATUS,
  },
  {
    key: 'project-report',
    name: 'Proje Raporu',
    description:
      'Proje geneli: sipariş emirlerinin terminleri ve durumu, süreçlerin bulunduğu aşama, ham madde stok durumu ve kalıpların saha/depo konumu.',
    dataSource: ReportDataSource.ProjectReport,
    recipe: ReportRecipe.ChromePdf,
    content: PROJECT_REPORT,
  },
  {
    key: 'order-report',
    name: 'Sipariş Emri Raporu',
    description:
      'Tek sipariş emri: kullanılan ham maddeler, aşamaların yürütüldüğü lokasyonların sıcaklık/nem grafikleri ve süreç/aşama personeli ile plan-fiili zaman çizelgesi.',
    dataSource: ReportDataSource.OrderReport,
    recipe: ReportRecipe.ChromePdf,
    content: ORDER_REPORT,
  },
  {
    key: 'location-report',
    name: 'Lokasyon Raporu',
    description:
      'Seçilen tarih aralığında lokasyonun sıcaklık/nem eğrileri ve yapılan siparişlerin rezervasyon/operasyon takvimi.',
    dataSource: ReportDataSource.LocationReport,
    recipe: ReportRecipe.ChromePdf,
    content: LOCATION_REPORT,
  },
  {
    key: 'personnel-report',
    name: 'Personel Raporu',
    description:
      'Seçilen tarih aralığında personelin doluluk takvimi, tamamladığı aşamalar ve atandığı tüm sipariş emri proses aşamaları.',
    dataSource: ReportDataSource.PersonnelReport,
    recipe: ReportRecipe.ChromePdf,
    content: PERSONNEL_REPORT,
  },
];
