import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StockItem } from '../../inventory/entities/stock-item.entity';
import { StockItemStatus } from '../../inventory/enums/stock-item-status.enum';
import { Material } from '../../inventory/entities/material.entity';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Process } from '../../project/entities/process.entity';
import { Project } from '../../project/entities/project.entity';
import { ProjectMaterialReorder } from '../../project/entities/project-material-reorder.entity';
import { ToolCategory } from '../../tooling/enums/tool-category.enum';
import { ToolAssignmentStatus } from '../../tooling/enums/tool-assignment-status.enum';
import { ToolAssignment } from '../../tooling/entities/tool-assignment.entity';
import { Tool } from '../../tooling/entities/tool.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { COLOR, STAGE_STATUS_SEGMENTS } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

type DerivedStatus = 'completed' | 'in_progress' | 'pending';

const STATUS_META: Record<DerivedStatus, { label: string; color: string }> = {
  completed: { label: 'Tamamlandı', color: COLOR.completed },
  in_progress: { label: 'Devam Ediyor', color: COLOR.inProgress },
  pending: { label: 'Bekliyor', color: COLOR.pending },
};

/** min/max over a mixed list of date strings / Date / null, returned as-is. */
function pickDate(
  values: Array<string | Date | null | undefined>,
  mode: 'min' | 'max',
): string | Date | null {
  let best: string | Date | null = null;
  let bestMs = mode === 'min' ? Infinity : -Infinity;
  for (const v of values) {
    if (v == null) continue;
    const ms = v instanceof Date ? v.getTime() : new Date(v).getTime();
    if (isNaN(ms)) continue;
    if ((mode === 'min' && ms < bestMs) || (mode === 'max' && ms > bestMs)) {
      bestMs = ms;
      best = v;
    }
  }
  return best;
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Detailed project report ("Proje Raporu"). Rolls up the project's orders with
 * their termin/timeline and derived status, the processes with the stage each
 * is currently on, the project's raw-material requirements joined to live
 * inventory stock, and its molds (field vs. warehouse).
 */
@Injectable()
export class ProjectReportDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.ProjectReport;
  readonly label = 'Proje Raporu';
  readonly params: ReportParamField[] = [
    { name: 'projectId', label: 'Project', type: 'project', required: true },
  ];

  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(Material)
    private readonly materials: Repository<Material>,
    @InjectRepository(ProjectMaterialReorder)
    private readonly reorders: Repository<ProjectMaterialReorder>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(Tool) private readonly tools: Repository<Tool>,
    @InjectRepository(ToolAssignment)
    private readonly toolAssignments: Repository<ToolAssignment>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = String(params.projectId ?? '');
    if (!projectId) throw new BadRequestException('projectId is required');

    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const orders = await this.orders.find({
      where: { projectId },
      order: { orderNumber: 'ASC' },
    });
    const orderIds = orders.map((o) => o.id);

    const processes = orderIds.length
      ? await this.processes.find({
          where: { orderItem: { orderId: In(orderIds) } },
          order: { createdAt: 'ASC' },
        })
      : [];
    const processIds = processes.map((p) => p.id);

    const stages = processIds.length
      ? await this.stages.find({
          where: { processId: In(processIds) },
          order: { sequence: 'ASC' },
        })
      : [];
    const stageIds = stages.map((s) => s.id);

    const stagesByProcess = new Map<string, ProcessStage[]>();
    for (const s of stages) {
      const list = stagesByProcess.get(s.processId) ?? [];
      list.push(s);
      stagesByProcess.set(s.processId, list);
    }
    const processesByOrder = new Map<string, Process[]>();
    for (const p of processes) {
      const list = processesByOrder.get(p.orderItem.orderId) ?? [];
      list.push(p);
      processesByOrder.set(p.orderItem.orderId, list);
    }

    // ---- Aggregate counters ----
    let totalStages = 0;
    let completedStages = 0;
    let inProgressStages = 0;
    let pendingStages = 0;
    let totalDurationHours = 0;
    let completedProcesses = 0;
    let inProgressProcesses = 0;
    let pendingProcesses = 0;
    let completedOrders = 0;
    let inProgressOrders = 0;
    let pendingOrders = 0;

    const orderCompletion: Array<{ label: string; value: number }> = [];

    const orderViews = orders.map((order) => {
      const orderProcesses = processesByOrder.get(order.id) ?? [];
      let orderTotalStages = 0;
      let orderCompletedStages = 0;
      let orderCompletedProcesses = 0;
      let anyStarted = false;

      const processViews = orderProcesses.map((p) => {
        const ps = (stagesByProcess.get(p.id) ?? []).slice();
        let pTotal = 0;
        let pCompleted = 0;
        for (const s of ps) {
          pTotal += 1;
          totalStages += 1;
          orderTotalStages += 1;
          totalDurationHours += Number(s.durationHours ?? 0);
          if (s.status === 'completed') {
            completedStages += 1;
            orderCompletedStages += 1;
            pCompleted += 1;
            anyStarted = true;
          } else if (s.status === 'in_progress') {
            inProgressStages += 1;
            anyStarted = true;
          } else {
            pendingStages += 1;
          }
          if (s.startedAt) anyStarted = true;
        }

        // "Hangi stage'de" — the active stage, else the next pending one.
        const active = ps.find((s) => s.status === 'in_progress');
        const nextPending = ps.find((s) => s.status === 'pending');
        const current = active ?? nextPending ?? null;

        // Process status counters (draft counts as pending/waiting).
        if (p.overallStatus === 'completed') completedProcesses += 1;
        else if (p.overallStatus === 'in_progress') inProgressProcesses += 1;
        else pendingProcesses += 1;

        if (p.overallStatus === 'completed') orderCompletedProcesses += 1;

        return {
          category: p.category?.name ?? null,
          status: p.overallStatus,
          responsible: p.responsibleUser?.name ?? null,
          totalStages: pTotal,
          completedStages: pCompleted,
          completionPct: pTotal ? (pCompleted / pTotal) * 100 : 0,
          currentStageName:
            current?.name ?? (pTotal && pCompleted === pTotal ? null : '—'),
          currentStageStatus:
            current?.status ??
            (pCompleted === pTotal && pTotal ? 'completed' : 'pending'),
          startedAt: p.startedAt,
          completedAt: p.completedAt,
          estimatedStartDate: p.estimatedStartDate,
          estimatedCompletedDate: p.estimatedCompletedDate,
          durationHours: p.durationHours,
        };
      });

      // Derived order status from its stages.
      let status: DerivedStatus;
      if (orderTotalStages > 0 && orderCompletedStages === orderTotalStages) {
        status = 'completed';
      } else if (anyStarted) {
        status = 'in_progress';
      } else {
        status = 'pending';
      }
      if (status === 'completed') completedOrders += 1;
      else if (status === 'in_progress') inProgressOrders += 1;
      else pendingOrders += 1;

      const completionPct = orderTotalStages
        ? (orderCompletedStages / orderTotalStages) * 100
        : 0;
      orderCompletion.push({ label: order.orderNumber, value: completionPct });

      const plannedStart = pickDate(
        orderProcesses.flatMap((p) => [
          p.estimatedStartDate,
          ...(stagesByProcess.get(p.id) ?? []).map((s) => s.estimatedStartDate),
        ]),
        'min',
      );
      const plannedEnd = pickDate(
        orderProcesses.flatMap((p) => [
          p.estimatedCompletedDate,
          ...(stagesByProcess.get(p.id) ?? []).map(
            (s) => s.estimatedCompletedDate,
          ),
        ]),
        'max',
      );
      const actualStart = pickDate(
        orderProcesses.flatMap((p) => [
          p.startedAt,
          ...(stagesByProcess.get(p.id) ?? []).map((s) => s.startedAt),
        ]),
        'min',
      );
      const actualEnd =
        status === 'completed'
          ? pickDate(
              orderProcesses.flatMap((p) => [
                p.completedAt,
                ...(stagesByProcess.get(p.id) ?? []).map((s) => s.completedAt),
              ]),
              'max',
            )
          : null;

      return {
        orderNumber: order.orderNumber,
        name: order.name,
        dueDate: order.dueDate,
        status,
        statusText: STATUS_META[status].label,
        statusColorHex: STATUS_META[status].color,
        plannedStart,
        plannedEnd,
        actualStart,
        actualEnd,
        totalProcesses: orderProcesses.length,
        completedProcesses: orderCompletedProcesses,
        totalStages: orderTotalStages,
        completedStages: orderCompletedStages,
        completionPct,
        processes: processViews,
      };
    });

    const completionPct = totalStages
      ? (completedStages / totalStages) * 100
      : 0;
    orderCompletion.sort((a, b) => b.value - a.value);

    // ---- Raw materials: aggregate MRP + BOM lines, join live inventory ----
    const materials = await this.aggregateMaterials(stageIds, projectId);

    // ---- Molds: field (active checkout) vs. warehouse ----
    const moldData = await this.buildMolds(
      orders.map((o) => o.orderNumber),
      project.code,
    );

    return {
      generatedAt: new Date().toISOString(),
      subject: `${project.code} ${project.name}`.trim(),
      project: {
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        manager: project.managerUser?.name ?? null,
        customer: project.customerCompany?.name ?? null,
        contact: project.contactPerson
          ? `${project.contactPerson.firstName} ${project.contactPerson.lastName}`.trim()
          : null,
      },
      summary: {
        totalOrders: orders.length,
        completedOrders,
        inProgressOrders,
        pendingOrders,
        totalProcesses: processes.length,
        completedProcesses,
        inProgressProcesses,
        pendingProcesses,
        totalStages,
        completedStages,
        inProgressStages,
        pendingStages,
        completionPct,
        totalDurationHours,
        materialCount: materials.summary.totalMaterials,
        shortageCount: materials.summary.shortageCount,
        moldCount: moldData.summary.total,
        moldsInField: moldData.summary.inField,
        moldsInWarehouse: moldData.summary.inWarehouse,
      },
      charts: {
        orderStatus: [
          {
            label: 'Tamamlanan',
            value: completedOrders,
            color: COLOR.completed,
          },
          {
            label: 'Devam Eden',
            value: inProgressOrders,
            color: COLOR.inProgress,
          },
          { label: 'Bekleyen', value: pendingOrders, color: COLOR.pending },
        ],
        stageStatus: STAGE_STATUS_SEGMENTS(
          completedStages,
          inProgressStages,
          pendingStages,
        ),
        orderCompletion: orderCompletion.slice(0, 8),
        moldLocation: [
          {
            label: 'Sahada',
            value: moldData.summary.inField,
            color: COLOR.inProgress,
          },
          {
            label: 'Depoda',
            value: moldData.summary.inWarehouse,
            color: COLOR.ok,
          },
        ],
      },
      orders: orderViews,
      materials: materials.rows,
      materialsSummary: materials.summary,
      molds: moldData.rows,
      moldSummary: moldData.summary,
      moldScope: moldData.scope,
    };
  }

  /** Aggregate MRP + BOM lines by item and join inventory stock by SKU. */
  private async aggregateMaterials(
    stageIds: string[],
    projectId: string,
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    summary: {
      totalMaterials: number;
      shortageCount: number;
      lowStockCount: number;
    };
  }> {
    if (stageIds.length === 0) {
      return {
        rows: [],
        summary: { totalMaterials: 0, shortageCount: 0, lowStockCount: 0 },
      };
    }
    // The MRP/BOM detail tables were removed (generic-only stage types);
    // no source rows remain, so this report section renders empty.
    const mrp: Array<{
      itemCode: string | null;
      itemName: string;
      unit: string | null;
      requiredQuantity: number | null;
      shortageQuantity: number | null;
      availableQuantity: number | null;
      processStageId: string;
    }> = [];
    const bom: Array<{
      itemCode: string | null;
      itemName: string;
      unit: string | null;
      quantity: number | null;
      processStageId: string;
    }> = [];

    interface Agg {
      code: string | null;
      name: string;
      unit: string | null;
      required: number;
      available: number | null;
      shortage: number;
      hasMrp: boolean;
    }
    const map = new Map<string, Agg>();
    const keyOf = (code: string | null, name: string) =>
      norm(code) || norm(name) || Math.random().toString(36);

    for (const l of mrp) {
      const key = keyOf(l.itemCode, l.itemName);
      const agg = map.get(key) ?? {
        code: l.itemCode,
        name: l.itemName,
        unit: l.unit,
        required: 0,
        available: null,
        shortage: 0,
        hasMrp: false,
      };
      agg.required += Number(l.requiredQuantity ?? 0);
      agg.shortage += Number(l.shortageQuantity ?? 0);
      if (l.availableQuantity != null) {
        agg.available = (agg.available ?? 0) + Number(l.availableQuantity);
      }
      agg.unit = agg.unit ?? l.unit;
      agg.code = agg.code ?? l.itemCode;
      agg.hasMrp = true;
      map.set(key, agg);
    }
    for (const l of bom) {
      const key = keyOf(l.itemCode, l.itemName);
      const agg = map.get(key) ?? {
        code: l.itemCode,
        name: l.itemName,
        unit: l.unit,
        required: 0,
        available: null,
        shortage: 0,
        hasMrp: false,
      };
      agg.required += Number(l.quantity ?? 0);
      agg.unit = agg.unit ?? l.unit;
      agg.code = agg.code ?? l.itemCode;
      map.set(key, agg);
    }

    const aggs = [...map.values()];
    // Join inventory stock by SKU (only for items that carry a code).
    const codes = aggs.map((a) => a.code).filter((c): c is string => !!c);
    const stockBySku = new Map<string, Material>();
    // Effective on-hand per material = SUM of its on-hand stock items
    // (available + reserved), joined through the lot.
    const onHandById = new Map<string, number>();
    // Per-project reorder (critical-stock) levels for the materials. `low`
    // means the on-hand stock is below the project's reorder level.
    const reorderByMaterialId = new Map<string, number>();
    const reorderRows = await this.reorders.find({ where: { projectId } });
    for (const r of reorderRows) {
      reorderByMaterialId.set(r.materialId, r.reorderLevel);
    }
    if (codes.length) {
      const mats = await this.materials.find({ where: { code: In(codes) } });
      for (const m of mats) stockBySku.set(norm(m.code), m);

      if (mats.length) {
        const sums = await this.stockItems
          .createQueryBuilder('si')
          .innerJoin('si.lot', 'l')
          .select('l.material_id', 'materialId')
          .addSelect('COALESCE(SUM(si.quantity), 0)', 'sum')
          .where('l.material_id IN (:...ids)', { ids: mats.map((m) => m.id) })
          .andWhere('si.status IN (:...statuses)', {
            statuses: [
              StockItemStatus.Available,
              StockItemStatus.Reserving,
              StockItemStatus.Reserved,
              StockItemStatus.Delivering,
              StockItemStatus.Delivered,
              StockItemStatus.Returning,
            ],
          })
          .groupBy('l.material_id')
          .getRawMany<{ materialId: string; sum: string }>();
        for (const s of sums) onHandById.set(s.materialId, Number(s.sum));
      }
    }

    let shortageCount = 0;
    let lowStockCount = 0;
    const rows = aggs
      .map((a) => {
        const mat = a.code ? stockBySku.get(norm(a.code)) : undefined;
        const onHand = mat ? (onHandById.get(mat.id) ?? 0) : null;
        const reorderLevel = mat
          ? (reorderByMaterialId.get(mat.id) ?? null)
          : null;
        const low =
          onHand != null &&
          reorderLevel != null &&
          reorderLevel > 0 &&
          onHand < reorderLevel;
        const shortage = a.shortage > 0 ? a.shortage : 0;
        if (shortage > 0) shortageCount += 1;
        if (low) lowStockCount += 1;
        return {
          code: a.code,
          name: a.name,
          unit: a.unit,
          required: a.required,
          available: a.available,
          shortage,
          onHand,
          reorderLevel,
          low,
          inStock: mat != null,
        };
      })
      .sort(
        (x, y) =>
          Number(y.shortage) - Number(x.shortage) ||
          x.name.localeCompare(y.name, 'tr'),
      );

    return {
      rows,
      summary: { totalMaterials: rows.length, shortageCount, lowStockCount },
    };
  }

  /** Project molds with field/warehouse state; scoped to the project when its
   * order numbers/code appear in an active checkout, else all molds. */
  private async buildMolds(
    orderNumbers: string[],
    projectCode: string,
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    summary: { total: number; inField: number; inWarehouse: number };
    scope: 'project' | 'all';
  }> {
    const molds = await this.tools.find({
      where: { category: ToolCategory.Mold },
      order: { code: 'ASC' },
    });
    if (molds.length === 0) {
      return {
        rows: [],
        summary: { total: 0, inField: 0, inWarehouse: 0 },
        scope: 'all',
      };
    }
    const active = await this.toolAssignments.find({
      where: {
        toolId: In(molds.map((m) => m.id)),
        status: ToolAssignmentStatus.Active,
      },
      order: { createdAt: 'DESC' },
    });
    const assignmentByTool = new Map<string, ToolAssignment>();
    for (const a of active)
      if (!assignmentByTool.has(a.toolId)) assignmentByTool.set(a.toolId, a);

    const tokens = [projectCode, ...orderNumbers].map(norm).filter(Boolean);
    const matchesProject = (text: string | null | undefined): boolean => {
      const t = norm(text);
      return tokens.some((tok) => tok.length > 0 && t.includes(tok));
    };

    const build = (tool: Tool) => {
      const a = assignmentByTool.get(tool.id);
      const inField = !!a;
      return {
        code: tool.code,
        name: tool.name,
        status: tool.status,
        serialNumber: tool.serialNumber,
        inField,
        assignedTo: a?.assignedTo ?? null,
        location: inField
          ? `Saha · ${a?.assignedTo ?? '—'}`
          : tool.rack?.code
            ? `Depo · Raf ${tool.rack.code}`
            : 'Depo',
        pillLabel: inField ? 'Sahada' : 'Depoda',
        pillColor: inField ? COLOR.inProgress : COLOR.ok,
        projectLinked: inField && matchesProject(a?.assignedTo),
      };
    };

    const all = molds.map(build);
    const linked = all.filter((m) => m.projectLinked);
    const shown = linked.length > 0 ? linked : all;
    const inField = shown.filter((m) => m.inField).length;

    return {
      rows: shown,
      summary: {
        total: shown.length,
        inField,
        inWarehouse: shown.length - inField,
      },
      scope: linked.length > 0 ? 'project' : 'all',
    };
  }
}
