import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryBalancesService } from '../../inventory/inventory-balances.service';
import { Tool } from '../../tooling/entities/tool.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { COLOR, paletteColor } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

/**
 * Cross-domain resource report: inventory stock levels (current/reserved/
 * available via InventoryBalancesService) and tool life/usage (current vs rated
 * life cycle).
 */
@Injectable()
export class InventoryToolingDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.InventoryTooling;
  readonly label = 'Inventory & Tooling';
  readonly params: ReportParamField[] = [
    {
      name: 'warehouseId',
      label: 'Warehouse (optional)',
      type: 'warehouse',
      required: false,
    },
  ];

  constructor(
    private readonly balances: InventoryBalancesService,
    @InjectRepository(Tool) private readonly tools: Repository<Tool>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const warehouseId = params.warehouseId
      ? String(params.warehouseId)
      : undefined;

    const [balances] = await this.balances.findPaginated({
      skip: 0,
      take: 1000,
      warehouseId,
    });

    // Reorder is now per-order (OrderMaterialRequirement), so this global
    // stock report no longer flags low stock — that lives in the project report.
    const lowStockCount = 0;
    const stock = balances.map((b) => {
      const reorderLevel = 0;
      const low = false;
      return {
        code: b.material?.code ?? null,
        material: b.material?.name ?? null,
        unit: b.material?.materialUnit?.name ?? null,
        warehouse: b.warehouse?.name ?? null,
        rack: b.rack?.code ?? null,
        lot: b.lot?.lotNumber ?? null,
        currentStock: b.currentStock,
        reservedStock: b.reservedStock,
        availableStock: b.availableStock,
        reorderLevel,
        low,
      };
    });

    const tools = await this.tools.find({ order: { code: 'ASC' } });
    let nearEolCount = 0;
    const toolViews = tools.map((t) => {
      const max = t.maxLifeCycle ?? 0;
      const lifeUsedPct = max > 0 ? (t.currentLifeCycle / max) * 100 : null;
      const nearEol = lifeUsedPct !== null && lifeUsedPct >= 80;
      if (nearEol) nearEolCount += 1;
      return {
        code: t.code,
        name: t.name,
        category: t.category,
        status: t.status,
        type: t.toolType?.name ?? null,
        quantity: t.quantity,
        currentLifeCycle: t.currentLifeCycle,
        maxLifeCycle: t.maxLifeCycle,
        lifeUsedPct,
        nearEol,
        nextMaintenanceDate: t.nextMaintenanceDate,
      };
    });

    // Tool status distribution (donut).
    const statusCounts = new Map<string, number>();
    for (const t of tools) {
      statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    }
    const toolStatus = [...statusCounts.entries()].map(([label, value], i) => ({
      label,
      value,
      color: paletteColor(i),
    }));

    // Top tools by life used % (bar chart).
    const toolLife = toolViews
      .filter((t) => t.lifeUsedPct !== null)
      .sort((a, b) => (b.lifeUsedPct ?? 0) - (a.lifeUsedPct ?? 0))
      .slice(0, 10)
      .map((t) => ({ label: t.code, value: t.lifeUsedPct ?? 0 }));

    return {
      generatedAt: new Date().toISOString(),
      // Human label used to build the generated file name.
      subject: warehouseId
        ? (stock.find((s) => s.warehouse)?.warehouse ?? 'Depo')
        : 'Tum Depolar',
      summary: {
        materialBalances: stock.length,
        lowStockCount,
        toolCount: tools.length,
        nearEolCount,
      },
      charts: {
        stockHealth: [
          {
            label: 'Yeterli',
            value: stock.length - lowStockCount,
            color: COLOR.ok,
          },
          { label: 'Düşük Stok', value: lowStockCount, color: COLOR.low },
        ],
        toolStatus,
        toolLife,
      },
      stock,
      tools: toolViews,
    };
  }
}
