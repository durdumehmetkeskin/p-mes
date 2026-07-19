import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { Repository } from 'typeorm';
import { MinioService } from '../storage/minio.service';
import { OrderItem } from '../project/entities/order-item.entity';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectsService } from '../project/projects.service';
import type { User } from '../users/entities/user.entity';
import { Attachment } from './entities/attachment.entity';
import { AttachmentOwnerType } from './enums/attachment-owner-type.enum';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    private readonly projects: ProjectsService,
    private readonly minio: MinioService,
  ) {}

  /** The project that owns an attachment target (project/process/stage). */
  private async resolveProjectId(
    ownerType: AttachmentOwnerType,
    ownerId: string,
  ): Promise<string | null> {
    if (ownerType === AttachmentOwnerType.Project) return ownerId;
    if (ownerType === AttachmentOwnerType.Process) {
      const p = await this.processes.findOne({ where: { id: ownerId } });
      return p?.orderItem?.order?.projectId ?? null;
    }
    if (ownerType === AttachmentOwnerType.OrderItem) {
      // OrderItem eager-loads its order; the order carries the project FK.
      const item = await this.orderItems.findOne({ where: { id: ownerId } });
      return item?.order?.projectId ?? null;
    }
    // Stage / stage_input / stage_output all own a ProcessStage id:
    // stage → its process → order item → order → project.
    const stage = await this.stages.findOne({ where: { id: ownerId } });
    if (!stage) return null;
    const p = await this.processes.findOne({
      where: { id: stage.processId },
    });
    return p?.orderItem?.order?.projectId ?? null;
  }

  /** Non-admins must be a member of the owning project (else 404, no leak). */
  private async assertOwnerAccess(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    user?: User,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    const projectId = await this.resolveProjectId(ownerType, ownerId);
    if (!projectId || !(await this.projects.isMember(projectId, user.id))) {
      throw new NotFoundException('Attachment owner not found');
    }
  }

  /**
   * Stage-scoped document authz (project/process docs stay member-wide):
   * - stage_input: part of the stage's PLAN — only the owning process's
   *   responsible user or an admin (stage workers only record outputs).
   * - stage / stage_output: acting on a stage — only that stage's workers,
   *   the process responsible or an admin; other members are view-only.
   */
  private async assertStageDocEditor(
    ownerType: AttachmentOwnerType,
    stageId: string,
    user?: User,
  ): Promise<void> {
    const stageScoped =
      ownerType === AttachmentOwnerType.Stage ||
      ownerType === AttachmentOwnerType.StageInput ||
      ownerType === AttachmentOwnerType.StageOutput;
    if (!stageScoped) return;
    if (!user || ProjectsService.isAdmin(user)) return;
    // stage.workers is an eager relation on ProcessStage.
    const stage = await this.stages.findOne({ where: { id: stageId } });
    const process = stage
      ? await this.processes.findOne({ where: { id: stage.processId } })
      : null;
    const isResponsible = process?.responsibleUserId === user.id;
    if (ownerType === AttachmentOwnerType.StageInput) {
      if (!isResponsible) {
        throw new ForbiddenException(
          'Girdi dokümanlarını yalnızca proses sorumlusu veya admin yönetebilir.',
        );
      }
      return;
    }
    const isWorker = (stage?.workers ?? []).some((w) => w.id === user.id);
    if (!isResponsible && !isWorker) {
      throw new ForbiddenException(
        'Bu aşamanın dokümanlarını yalnızca aşama çalışanı, proses sorumlusu veya admin yönetebilir.',
      );
    }
  }

  /**
   * PROJECT, ORDER-ITEM and PROCESS documents are managed only by an admin or
   * the project's manager — plain members read/download them but cannot
   * add/remove. (Stage docs have their own worker/responsible rule above.)
   */
  private async assertProjectDocEditor(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    user?: User,
  ): Promise<void> {
    if (
      ownerType !== AttachmentOwnerType.Project &&
      ownerType !== AttachmentOwnerType.OrderItem &&
      ownerType !== AttachmentOwnerType.Process
    ) {
      return;
    }
    if (!user || ProjectsService.isAdmin(user)) return;
    const projectId = await this.resolveProjectId(ownerType, ownerId);
    const project = projectId
      ? await this.projects.findOne(projectId)
      : null;
    if (project?.managerUserId !== user.id) {
      throw new ForbiddenException(
        'Bu dosyaları yalnızca proje yöneticisi veya admin yönetebilir.',
      );
    }
  }

  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: Express.Multer.File | undefined,
    user?: User,
  ): Promise<Attachment> {
    // Non-members cannot upload into a project they don't belong to (404).
    await this.assertOwnerAccess(ownerType, ownerId, user);
    await this.assertStageDocEditor(ownerType, ownerId, user);
    await this.assertProjectDocEditor(ownerType, ownerId, user);
    if (!file) throw new BadRequestException('A file is required.');
    // multer decodes the filename as latin1; restore UTF-8 (Turkish names etc).
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const objectKey = `${ownerType}/${ownerId}/${randomUUID()}`;
    await this.minio.put(objectKey, file.buffer, file.mimetype);
    const attachment = this.repo.create({
      ownerType,
      ownerId,
      fileName,
      objectKey,
      contentType: file.mimetype,
      size: file.size,
      uploadedById: user?.id ?? null,
    });
    return this.repo.save(attachment);
  }

  async findForOwner(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    user?: User,
  ): Promise<Attachment[]> {
    await this.assertOwnerAccess(ownerType, ownerId, user);
    return this.repo.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findOne(id: string): Promise<Attachment> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Attachment ${id} not found`);
    return found;
  }

  async getForDownload(
    id: string,
    user?: User,
  ): Promise<{ attachment: Attachment; stream: Readable }> {
    const attachment = await this.findOne(id);
    await this.assertOwnerAccess(
      attachment.ownerType,
      attachment.ownerId,
      user,
    );
    const stream = await this.minio.getStream(attachment.objectKey);
    return { attachment, stream };
  }

  async remove(id: string, user?: User): Promise<void> {
    const attachment = await this.findOne(id);
    // Same membership scoping as reads/uploads (non-members 404).
    await this.assertOwnerAccess(
      attachment.ownerType,
      attachment.ownerId,
      user,
    );
    await this.assertStageDocEditor(
      attachment.ownerType,
      attachment.ownerId,
      user,
    );
    await this.assertProjectDocEditor(
      attachment.ownerType,
      attachment.ownerId,
      user,
    );
    await this.minio.remove(attachment.objectKey).catch(() => undefined);
    await this.repo.delete(id);
  }
}
