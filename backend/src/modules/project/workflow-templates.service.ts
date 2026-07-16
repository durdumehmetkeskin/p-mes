import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import { dagErrorMessage, topoSort, validateDag } from './dag.util';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { WorkflowTemplateLinkInputDto } from './dto/workflow-template-link-input.dto';
import { WorkflowTemplateStageInputDto } from './dto/workflow-template-stage-input.dto';
import { StageType } from './entities/stage-type.entity';
import { WorkflowTemplateStage } from './entities/workflow-template-stage.entity';
import { WorkflowTemplateStageLink } from './entities/workflow-template-stage-link.entity';
import { WorkflowTemplate } from './entities/workflow-template.entity';

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WorkflowTemplate)
    private readonly repo: Repository<WorkflowTemplate>,
    @InjectRepository(StageType)
    private readonly stageTypes: Repository<StageType>,
  ) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof WorkflowTemplate;
    order: 'ASC' | 'DESC';
    categoryId?: string;
    projectId?: string;
  }): Promise<[WorkflowTemplate[], number]> {
    const base: FindOptionsWhere<WorkflowTemplate> = {};
    if (options.categoryId) base.categoryId = options.categoryId;
    // Global templates (project_id IS NULL) plus the given project's own.
    const where: FindOptionsWhere<WorkflowTemplate>[] = options.projectId
      ? [
          { ...base, projectId: IsNull() },
          { ...base, projectId: options.projectId },
        ]
      : [{ ...base, projectId: IsNull() }];
    return this.repo.findAndCount({
      where,
      relations: { stages: true },
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order, stages: { sequence: 'ASC' } },
    });
  }

  /** Template with its ordered stages (and each stage's catalog type). */
  async findOneWithStages(id: string): Promise<WorkflowTemplate> {
    const found = await this.repo.findOne({
      where: { id },
      relations: { stages: { stageType: true } },
      order: { stages: { sequence: 'ASC' } },
    });
    if (!found)
      throw new NotFoundException(`Workflow template ${id} not found`);
    return found;
  }

  async create(dto: CreateWorkflowTemplateDto): Promise<WorkflowTemplate> {
    await this.assertStagesMatchCategory(dto.categoryId, dto.stages ?? []);
    const id = await this.dataSource.transaction(async (manager) => {
      const template = manager.create(WorkflowTemplate, {
        name: dto.name,
        description: dto.description ?? null,
        categoryId: dto.categoryId,
        projectId: dto.projectId ?? null,
        isSystemDefault: false,
        isActive: true,
      });
      const saved = await manager.save(template);
      await this.insertStages(manager, saved.id, dto.stages ?? [], dto.links);
      return saved.id;
    });
    return this.findOneWithStages(id);
  }

  async update(
    id: string,
    dto: UpdateWorkflowTemplateDto,
  ): Promise<WorkflowTemplate> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow template ${id} not found`);
    }
    const effectiveCategory = dto.categoryId ?? existing.categoryId;
    if (dto.stages !== undefined) {
      await this.assertStagesMatchCategory(effectiveCategory, dto.stages);
    }
    // Links are index-based against the (replaced) stage list — meaningless
    // without it.
    if (dto.links !== undefined && dto.stages === undefined) {
      throw new BadRequestException(
        'links can only be set together with stages',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) existing.name = dto.name;
      if (dto.description !== undefined) existing.description = dto.description;
      if (dto.categoryId !== undefined) existing.categoryId = dto.categoryId;
      await manager.save(existing);

      // Replace the full stage list when provided (links go with it via FK
      // CASCADE on the hard delete).
      if (dto.stages !== undefined) {
        await manager.delete(WorkflowTemplateStage, { templateId: id });
        await this.insertStages(manager, id, dto.stages, dto.links);
      }
    });
    return this.findOneWithStages(id);
  }

  async remove(id: string): Promise<void> {
    const found = await this.repo.findOne({
      where: { id },
      relations: { stages: true },
    });
    if (!found)
      throw new NotFoundException(`Workflow template ${id} not found`);
    await this.repo.softRemove(found);
  }

  /** Copy a template (and its stages) into a new, user-owned template. */
  async duplicate(id: string, projectId?: string): Promise<WorkflowTemplate> {
    const source = await this.repo.findOne({
      where: { id },
      relations: { stages: true },
      order: { stages: { sequence: 'ASC' } },
    });
    if (!source)
      throw new NotFoundException(`Workflow template ${id} not found`);

    const newId = await this.dataSource.transaction(async (manager) => {
      const copy = manager.create(WorkflowTemplate, {
        name: `${source.name} (Copy)`,
        description: source.description,
        categoryId: source.categoryId,
        // The copy belongs to the current project (falls back to the source).
        projectId: projectId ?? source.projectId,
        isSystemDefault: false,
        isActive: true,
      });
      const saved = await manager.save(copy);
      const ordered = [...(source.stages ?? [])].sort(
        (a, b) => a.sequence - b.sequence,
      );
      // Map the source's id-based links to index pairs over the ordered list.
      const indexOf = new Map(ordered.map((s, i) => [s.id, i]));
      const links = ordered.flatMap((s) =>
        (s.incomingLinks ?? []).flatMap((l) => {
          const from = indexOf.get(l.fromStageId);
          const to = indexOf.get(s.id);
          return from !== undefined && to !== undefined
            ? [{ from, to, kind: l.kind }]
            : [];
        }),
      );
      await this.insertStages(
        manager,
        saved.id,
        ordered.map((s) => ({
          stageTypeId: s.stageTypeId,
          name: s.name ?? undefined,
          input: s.input ?? undefined,
          output: s.output ?? undefined,
          posX: s.posX ?? undefined,
          posY: s.posY ?? undefined,
        })),
        links,
      );
      return saved.id;
    });
    return this.findOneWithStages(newId);
  }

  /**
   * Enforce that every referenced stage type belongs to the template category —
   * a planning template may only contain planning stage types, etc.
   */
  private async assertStagesMatchCategory(
    categoryId: string,
    stages: WorkflowTemplateStageInputDto[],
  ): Promise<void> {
    if (stages.length === 0) return;
    const ids = [...new Set(stages.map((s) => s.stageTypeId))];
    const types = await this.stageTypes.find({ where: { id: In(ids) } });
    const byId = new Map(types.map((t) => [t.id, t]));
    const offending = ids.filter(
      (id) => byId.get(id)?.categoryId !== categoryId,
    );
    if (offending.length > 0) {
      throw new BadRequestException(
        'All stages must belong to the template category.',
      );
    }
  }

  /**
   * Insert the stage nodes + their DAG links. `links` are index pairs into
   * `stages`; when omitted a linear chain is synthesized (old clients keep
   * producing linear templates); `[]` means all stages are parallel roots.
   * `sequence` is assigned as the deterministic topological display order.
   */
  private async insertStages(
    manager: EntityManager,
    templateId: string,
    stages: WorkflowTemplateStageInputDto[],
    links?: WorkflowTemplateLinkInputDto[],
  ): Promise<void> {
    const effectiveLinks: WorkflowTemplateLinkInputDto[] =
      links ??
      stages.slice(1).map((_, i) => ({ from: i, to: i + 1 }));

    const keys = stages.map((_, i) => String(i));
    const edges = effectiveLinks.map((l) => ({
      from: String(l.from),
      to: String(l.to),
      kind: l.kind ?? 'sequence',
    }));
    const error = validateDag(keys, edges);
    if (error) throw new BadRequestException(dagErrorMessage(error));

    // Topological display order; ties keep the array order.
    const order = topoSort(keys, edges, (a, b) => Number(a) - Number(b))!;
    const sequenceOf = new Map(order.map((key, pos) => [key, pos + 1]));

    const ids: string[] = [];
    for (let i = 0; i < stages.length; i += 1) {
      const s = stages[i];
      const saved = await manager.save(
        manager.create(WorkflowTemplateStage, {
          templateId,
          stageTypeId: s.stageTypeId,
          sequence: sequenceOf.get(String(i))!,
          name: s.name ?? null,
          input: s.input ?? null,
          output: s.output ?? null,
          posX: s.posX ?? null,
          posY: s.posY ?? null,
        }),
      );
      ids.push(saved.id);
    }

    for (const l of effectiveLinks) {
      await manager.save(
        manager.create(WorkflowTemplateStageLink, {
          fromStageId: ids[l.from],
          toStageId: ids[l.to],
          kind: l.kind ?? 'sequence',
        }),
      );
    }
  }
}
