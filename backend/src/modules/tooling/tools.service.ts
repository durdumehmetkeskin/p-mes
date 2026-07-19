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
import { ChangeToolStatusDto } from './dto/change-tool-status.dto';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { Tool } from './entities/tool.entity';
import { ToolCategory } from './enums/tool-category.enum';
import { ToolStatus } from './enums/tool-status.enum';
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
    this.assertRackMatchesProject(dto.projectId ?? null, tool.rack ?? null);

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
    // Only when the edit touches placement, so scalar edits on legacy tools
    // with an out-of-project rack keep working.
    if (dto.projectId !== undefined || dto.rackId !== undefined) {
      this.assertRackMatchesProject(tool.projectId ?? null, tool.rack ?? null);
    }

    await this.toolsRepository.save(tool);
    return this.findOne(id); // reload eager relations
  }

  /**
   * A project tool must sit on a rack in one of the project's zones — the
   * zone is derived from the rack, so this is the whole "cannot go to another
   * zone" rule. Project-less tools are unconstrained.
   */
  private assertRackMatchesProject(
    projectId: string | null,
    rack: Tool['rack'],
  ): void {
    if (!projectId) return;
    if (!rack) {
      throw new BadRequestException(
        'Projeye ait takım için projenin bölgesinden bir raf seçilmelidir.',
      );
    }
    if (rack.zone?.projectId !== projectId) {
      throw new BadRequestException(
        'Projeye ait takım yalnızca projenin bölgesindeki bir rafa konabilir.',
      );
    }
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
        // Custody rides on the status row: an in_use entry says who holds it;
        // the next non-in_use entry IS the return.
        assignedTo:
          dto.status === ToolStatus.InUse ? (dto.assignedTo ?? null) : null,
        note: dto.note ?? null,
        changedById: actor?.id ?? null,
        changedByEmail: actor?.email ?? null,
      });
      await manager.save(history);
    });

    return this.findOne(id);
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
