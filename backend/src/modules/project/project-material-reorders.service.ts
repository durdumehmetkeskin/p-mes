import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../inventory/entities/material.entity';
import { SetProjectMaterialReorderDto } from './dto/set-project-material-reorder.dto';
import { ProjectMaterialReorder } from './entities/project-material-reorder.entity';

@Injectable()
export class ProjectMaterialReordersService {
  constructor(
    @InjectRepository(ProjectMaterialReorder)
    private readonly repo: Repository<ProjectMaterialReorder>,
    @InjectRepository(Material)
    private readonly materials: Repository<Material>,
  ) {}

  /**
   * Upsert a project's reorder level for a material. A level of 0 clears the
   * rule (soft-removes the row) so the table only holds active thresholds.
   */
  async set(
    dto: SetProjectMaterialReorderDto,
  ): Promise<ProjectMaterialReorder | null> {
    const material = await this.materials.findOne({
      where: { id: dto.materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }
    const existing = await this.repo.findOne({
      where: { projectId: dto.projectId, materialId: dto.materialId },
    });

    if (dto.reorderLevel <= 0) {
      if (existing) await this.repo.softRemove(existing);
      return null;
    }

    if (existing) {
      existing.reorderLevel = dto.reorderLevel;
      await this.repo.save(existing);
      return this.repo.findOne({ where: { id: existing.id } });
    }
    const saved = await this.repo.save(this.repo.create(dto));
    return this.repo.findOne({ where: { id: saved.id } });
  }
}
