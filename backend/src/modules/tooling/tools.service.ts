import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RacksService } from '../inventory/racks.service';
import {
  resolveWarehouseIds,
  WarehouseScope,
  WarehouseScopeService,
} from '../inventory/warehouse-scope.service';
import { QrService } from '../qr/qr.service';
import { QrResult } from '../qr/qr.types';
import { EntityManager } from 'typeorm';
import { AddToolCyclesDto } from './dto/add-tool-cycles.dto';
import { AssignToolDto } from './dto/assign-tool.dto';
import { ChangeToolStatusDto } from './dto/change-tool-status.dto';
import { CreateToolDto } from './dto/create-tool.dto';
import { EndToolUsageDto } from './dto/end-tool-usage.dto';
import { ResetToolCyclesDto } from './dto/reset-tool-cycles.dto';
import { ReturnToolDto } from './dto/return-tool.dto';
import { StartToolUsageDto } from './dto/start-tool-usage.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolCycleLog } from './entities/tool-cycle-log.entity';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { Tool } from './entities/tool.entity';
import { ToolAssignmentStatus } from './enums/tool-assignment-status.enum';
import { ToolCategory } from './enums/tool-category.enum';
import { ToolStatus } from './enums/tool-status.enum';
import { ToolUsageStatus } from './enums/tool-usage-status.enum';
import { ToolAssignmentsRepository } from './tool-assignments.repository';
import { ToolUsagesRepository } from './tool-usages.repository';
import { ToolTypesService } from './tool-types.service';
import { ToolsRepository } from './tools.repository';

interface StatusActor {
  id: string;
  email: string;
}

@Injectable()
export class ToolsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly toolsRepository: ToolsRepository,
    private readonly toolTypesService: ToolTypesService,
    private readonly racksService: RacksService,
    private readonly assignmentsRepository: ToolAssignmentsRepository,
    private readonly usagesRepository: ToolUsagesRepository,
    private readonly qrService: QrService,
  ) {}

  async create(
    dto: CreateToolDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    await this.assertCodeAvailable(dto.code);

    const { toolTypeId, rackId, ...rest } = dto;
    const tool = this.toolsRepository.create(rest);
    // Set via the relation object (not just the FK column) so TypeORM persists
    // it — when both are present on an entity, the relation object wins.
    if (toolTypeId) {
      tool.toolType = await this.toolTypesService.findOne(toolTypeId);
    }
    if (rackId) {
      tool.rack = await this.racksService.findOne(rackId);
    }

    // A warehouse responsible may only place a new tool into a rack in one of
    // their warehouses (an unplaced tool has no warehouse and is out of scope).
    if (scope !== 'ALL') {
      WarehouseScopeService.assertInScope(scope, tool.rack?.zone?.warehouseId);
    }

    const saved = await this.toolsRepository.save(tool);
    return this.findOne(saved.id); // reload eager relations
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Tool;
    order: 'ASC' | 'DESC';
    q?: string;
    category?: ToolCategory;
    status?: ToolStatus;
    rackId?: string;
    warehouseId?: string;
    projectId?: string;
    scope?: WarehouseScope;
  }): Promise<[Tool[], number]> {
    const warehouseIds = resolveWarehouseIds(
      options.scope ?? 'ALL',
      options.warehouseId,
    );
    return this.toolsRepository.findAndCount({ ...options, warehouseIds });
  }

  async findOne(id: string, scope: WarehouseScope = 'ALL'): Promise<Tool> {
    const tool = await this.toolsRepository.findById(id);
    if (!tool) {
      throw new NotFoundException(`Tool ${id} not found`);
    }
    if (scope !== 'ALL') {
      WarehouseScopeService.assertInScope(scope, tool.rack?.zone?.warehouseId);
    }
    return tool;
  }

  /** Generate a QR code (PNG) for a tool, encoding its id/code and deep link. */
  async generateQr(
    id: string,
    scope: WarehouseScope = 'ALL',
  ): Promise<QrResult> {
    const tool = await this.findOne(id, scope);
    const payload = this.qrService.buildPayload(
      'tool',
      tool.id,
      tool.code,
      `/tools/${tool.id}`,
    );
    const buffer = await this.qrService.toPng(payload);
    return { fileName: this.qrService.fileName('tool', tool.code), buffer };
  }

  async update(
    id: string,
    dto: UpdateToolDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);

    if (dto.code && dto.code !== tool.code) {
      await this.assertCodeAvailable(dto.code);
      tool.code = dto.code;
    }

    // Apply scalar fields; handle the relations via their objects below.
    const { code: _code, toolTypeId, rackId, ...rest } = dto;
    Object.assign(tool, rest);

    if (toolTypeId !== undefined) {
      tool.toolType = toolTypeId
        ? await this.toolTypesService.findOne(toolTypeId)
        : null;
    }
    if (rackId !== undefined) {
      tool.rack = rackId ? await this.racksService.findOne(rackId) : null;
    }

    await this.toolsRepository.save(tool);
    return this.findOne(id); // reload eager relations
  }

  /**
   * Change a tool's status and append an immutable history entry (who / when /
   * from → to / note) in one transaction. Rejects a no-op (same status).
   */
  async changeStatus(
    id: string,
    dto: ChangeToolStatusDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);
    if (tool.status === dto.status) {
      throw new BadRequestException(`Tool is already ${dto.status}`);
    }
    const fromStatus = tool.status;

    await this.dataSource.transaction(async (manager) => {
      tool.status = dto.status;
      await manager.save(tool);

      const history = manager.create(ToolStatusHistory, {
        toolId: tool.id,
        fromStatus,
        toStatus: dto.status,
        note: dto.note ?? null,
        changedById: actor?.id ?? null,
        changedByEmail: actor?.email ?? null,
      });
      await manager.save(history);
    });

    return this.findOne(id);
  }

  /**
   * Assign (check out) a tool to an assignee. A tool can have at most one
   * ACTIVE assignment — rejects if it is already assigned.
   */
  async assign(
    id: string,
    dto: AssignToolDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);

    const active = await this.assignmentsRepository.findActiveByTool(id);
    if (active) {
      throw new ConflictException(
        `Tool is already assigned to ${active.assignedTo}`,
      );
    }

    const assignment = this.assignmentsRepository.create({
      toolId: tool.id,
      assignedTo: dto.assignedTo,
      note: dto.note ?? null,
      status: ToolAssignmentStatus.Active,
      assignedById: actor?.id ?? null,
      assignedByEmail: actor?.email ?? null,
    });
    await this.assignmentsRepository.save(assignment);

    return this.findOne(id);
  }

  /** Return (check in) a tool's active assignment. */
  async return(
    id: string,
    dto: ReturnToolDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    await this.findOne(id, scope);

    const active = await this.assignmentsRepository.findActiveByTool(id);
    if (!active) {
      throw new BadRequestException('Tool has no active assignment');
    }

    active.status = ToolAssignmentStatus.Returned;
    active.returnedAt = new Date();
    active.returnNote = dto.note ?? null;
    active.returnedById = actor?.id ?? null;
    active.returnedByEmail = actor?.email ?? null;
    await this.assignmentsRepository.save(active);

    return this.findOne(id);
  }

  /**
   * Start a usage session (put the tool to work). A tool can have at most one
   * ONGOING session — rejects if it is already in use.
   */
  async startUsage(
    id: string,
    dto: StartToolUsageDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);

    const ongoing = await this.usagesRepository.findOngoingByTool(id);
    if (ongoing) {
      throw new ConflictException('Tool already has an ongoing usage session');
    }

    const usage = this.usagesRepository.create({
      toolId: tool.id,
      usedFor: dto.usedFor ?? null,
      note: dto.note ?? null,
      status: ToolUsageStatus.Ongoing,
      startedAt: new Date(),
      recordedById: actor?.id ?? null,
      recordedByEmail: actor?.email ?? null,
    });
    await this.usagesRepository.save(usage);

    return this.findOne(id);
  }

  /**
   * End the tool's ongoing usage session: stamps endedAt, computes the elapsed
   * minutes and records the output quantity. End of production also bumps the
   * cycle counter (currentLifeCycle) by the produced cycles (≥ 1), in the same
   * transaction, and logs the change.
   */
  async endUsage(
    id: string,
    dto: EndToolUsageDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);

    const ongoing = await this.usagesRepository.findOngoingByTool(id);
    if (!ongoing) {
      throw new BadRequestException('Tool has no ongoing usage session');
    }

    const endedAt = new Date();
    ongoing.endedAt = endedAt;
    ongoing.durationMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - ongoing.startedAt.getTime()) / 60000),
    );
    ongoing.quantity = dto.quantity ?? null;
    ongoing.status = ToolUsageStatus.Completed;
    if (dto.note) ongoing.note = dto.note;

    // Each production end increments the cycle counter by the produced cycles
    // (default 1 when no quantity was recorded).
    const increment =
      dto.quantity != null ? Math.max(0, Math.round(dto.quantity)) : 1;

    await this.dataSource.transaction(async (manager) => {
      await manager.save(ongoing);
      if (increment > 0) {
        tool.currentLifeCycle += increment;
        await manager.save(tool);
        await this.writeCycleLog(
          manager,
          tool,
          increment,
          'usage',
          ongoing.usedFor,
        );
      }
    });

    return this.findOne(id);
  }

  /** Manually add cycles to the counter (e.g. recording a past production). */
  async addCycles(
    id: string,
    dto: AddToolCyclesDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);

    await this.dataSource.transaction(async (manager) => {
      tool.currentLifeCycle += dto.cycles;
      await manager.save(tool);
      await this.writeCycleLog(
        manager,
        tool,
        dto.cycles,
        'manual',
        dto.note ?? null,
        actor,
      );
    });

    return this.findOne(id);
  }

  /** Reset the cycle counter to 0 (e.g. after a regrind / maintenance). */
  async resetCycles(
    id: string,
    dto: ResetToolCyclesDto,
    actor?: StatusActor,
    scope: WarehouseScope = 'ALL',
  ): Promise<Tool> {
    const tool = await this.findOne(id, scope);
    const previous = tool.currentLifeCycle;

    await this.dataSource.transaction(async (manager) => {
      tool.currentLifeCycle = 0;
      await manager.save(tool);
      await this.writeCycleLog(
        manager,
        tool,
        -previous,
        'reset',
        dto.note ?? null,
        actor,
      );
    });

    return this.findOne(id);
  }

  private async writeCycleLog(
    manager: EntityManager,
    tool: Tool,
    cycles: number,
    source: string,
    note: string | null,
    actor?: StatusActor,
  ): Promise<void> {
    const log = manager.create(ToolCycleLog, {
      toolId: tool.id,
      cycles,
      resultingLifeCycle: tool.currentLifeCycle,
      source,
      note,
      recordedById: actor?.id ?? null,
      recordedByEmail: actor?.email ?? null,
    });
    await manager.save(log);
  }

  async remove(id: string, scope: WarehouseScope = 'ALL'): Promise<void> {
    const tool = await this.findOne(id, scope);
    await this.toolsRepository.softRemove(tool);
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.toolsRepository.findByCode(code);
    if (existing) {
      throw new ConflictException(`Tool with code "${code}" already exists`);
    }
  }
}
