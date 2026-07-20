import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Process } from '../../project/entities/process.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { STAGE_STATUS_SEGMENTS } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

/**
 * Single work-order sheet: the order, its processes and stages, responsible
 * users and the planned/actual timeline.
 */
@Injectable()
export class WorkOrderDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.WorkOrder;
  readonly label = 'Work Order Detail';
  readonly params: ReportParamField[] = [
    { name: 'orderId', label: 'Order', type: 'order', required: true },
  ];

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const orderId = String(params.orderId ?? '');
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const processes = await this.processes.find({
      where: { orderItem: { orderId } },
      order: { createdAt: 'ASC' },
    });
    const processIds = processes.map((p) => p.id);
    const stages = processIds.length
      ? await this.stages.find({
          where: { processId: In(processIds) },
          order: { sequence: 'ASC' },
        })
      : [];

    const stagesByProcess = new Map<string, ProcessStage[]>();
    for (const s of stages) {
      const list = stagesByProcess.get(s.processId) ?? [];
      list.push(s);
      stagesByProcess.set(s.processId, list);
    }

    let totalStages = 0;
    let completedStages = 0;
    let inProgressStages = 0;
    let pendingStages = 0;
    const processCompletion: Array<{
      label: string;
      total: number;
      completed: number;
      value: number;
    }> = [];

    const processViews = processes.map((p, idx) => {
      let procTotal = 0;
      let procCompleted = 0;
      const stageViews = (stagesByProcess.get(p.id) ?? []).map((s) => {
        totalStages += 1;
        procTotal += 1;
        if (s.status === 'completed') {
          completedStages += 1;
          procCompleted += 1;
        } else if (s.status === 'in_progress') {
          inProgressStages += 1;
        } else {
          pendingStages += 1;
        }
        return {
          sequence: s.sequence,
          name: s.name,
          input: s.input,
          output: s.output,
          status: s.status,
          responsible: (s.workers ?? []).map((w) => w.name).join(', ') || null,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          durationHours: s.durationHours,
          estimatedStartDate: s.estimatedStartDate,
          estimatedCompletedDate: s.estimatedCompletedDate,
          note: s.note,
        };
      });
      if (procTotal > 0) {
        processCompletion.push({
          label: `Süreç ${idx + 1}`,
          total: procTotal,
          completed: procCompleted,
          value: (procCompleted / procTotal) * 100,
        });
      }
      return {
        status: p.overallStatus,
        responsible: p.responsibleUser?.name ?? null,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        durationHours: p.durationHours,
        stages: stageViews,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      // Human label used to build the generated file name.
      subject: order.project?.name
        ? `${order.orderNumber} ${order.project.name}`
        : order.orderNumber,
      order: {
        orderNumber: order.orderNumber,
        name: order.name,
        description: order.description,
        dueDate: order.dueDate,
        status: order.status,
        project: order.project?.name ?? null,
        projectCode: order.project?.code ?? null,
      },
      summary: {
        totalProcesses: processes.length,
        totalStages,
        completedStages,
        inProgressStages,
        pendingStages,
        completionPct: totalStages ? (completedStages / totalStages) * 100 : 0,
      },
      charts: {
        stageStatus: STAGE_STATUS_SEGMENTS(
          completedStages,
          inProgressStages,
          pendingStages,
        ),
        processCompletion: processCompletion.slice(0, 8),
      },
      processes: processViews,
    };
  }
}
