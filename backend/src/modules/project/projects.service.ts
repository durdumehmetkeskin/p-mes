import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Contact } from '../customers/entities/contact.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Lot } from '../inventory/entities/lot.entity';
import { Zone } from '../inventory/entities/zone.entity';
import { Tool } from '../tooling/entities/tool.entity';
import { Order } from './entities/order.entity';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { SystemRole } from '../roles/enums/system-role.enum';
import { User } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

/** A lightweight project member view (never leaks the password hash). */
export interface ProjectMember {
  id: string;
  name: string;
  email: string;
}

/** A contact attached to (or attachable to) a project. */
export interface ProjectContact {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly repo: Repository<Project>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Tool) private readonly tools: Repository<Tool>,
    private readonly notifications: NotificationsService,
  ) {}

  private static toContactView(c: Contact): ProjectContact {
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      role: c.role,
      email: c.email,
      phone: c.phone,
      isActive: c.isActive,
    };
  }

  static isAdmin(user?: Pick<User, 'roles'>): boolean {
    return Boolean(
      user?.roles?.some(
        (r) => (typeof r === 'string' ? r : r?.name) === SystemRole.Admin,
      ),
    );
  }

  /** Next `PRJ-YYYY-NNNN` (4-digit yearly sequence; skips no gaps on delete). */
  private async generateProjectCode(): Promise<string> {
    const prefix = `PRJ-${new Date().getFullYear()}-`;
    const rows = await this.repo.find({
      where: { code: Like(`${prefix}%`) },
      withDeleted: true,
      select: { code: true },
    });
    const max = rows.reduce(
      (m, r) =>
        Math.max(m, Number.parseInt(r.code.slice(prefix.length), 10) || 0),
      0,
    );
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  private isUniqueViolation(e: unknown): boolean {
    const err = e as { code?: string; driverError?: { code?: string } };
    return err?.code === '23505' || err?.driverError?.code === '23505';
  }

  async create(dto: CreateProjectDto, user?: User): Promise<Project> {
    // code is server-generated (never client-set) — drop any sent value.
    const { code: _code, ...rest } = dto;
    const project = this.repo.create(rest);
    // Auto-generate the code, retrying on the rare concurrent sequence
    // collision (the next attempt re-reads the max and increments).
    let saved: Project;
    for (let attempt = 0; ; attempt++) {
      project.code = await this.generateProjectCode();
      try {
        saved = await this.repo.save(project);
        break;
      } catch (e) {
        if (attempt < 5 && this.isUniqueViolation(e)) continue;
        throw e;
      }
    }
    // The creator joins the team so they can see their own project.
    if (user) {
      await this.repo
        .createQueryBuilder()
        .relation(Project, 'members')
        .of(saved.id)
        .add(user.id);
    }
    if (dto.managerUserId) {
      await this.notifications.notifyUser(
        dto.managerUserId,
        {
          type: NotificationType.Assignment,
          title: 'Proje yöneticiliği',
          message: `"${saved.name}" projesine yönetici olarak atandınız.`,
          link: `/projects/${saved.id}`,
          entityType: 'project',
          entityId: saved.id,
        },
        user?.id,
      );
    }
    return this.findOne(saved.id);
  }

  /** Non-admins only see projects they are a member of. */
  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Project;
    order: 'ASC' | 'DESC';
    q?: string;
    customerCompanyId?: string;
    user?: User;
  }): Promise<[Project[], number]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.managerUser', 'managerUser')
      .leftJoinAndSelect('p.customerCompany', 'customerCompany')
      .leftJoinAndSelect('p.contactPerson', 'contactPerson');

    if (options.customerCompanyId) {
      qb.andWhere('p.customer_company_id = :ccid', {
        ccid: options.customerCompanyId,
      });
    }
    if (options.q) {
      qb.andWhere('(p.code ILIKE :q OR p.name ILIKE :q)', {
        q: `%${options.q}%`,
      });
    }
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      qb.innerJoin('p.members', 'member', 'member.id = :uid', {
        uid: options.user.id,
      });
    }

    qb.orderBy(`p.${String(options.sort)}`, options.order)
      .skip(options.skip)
      .take(options.take);
    const [items, total] = await qb.getManyAndCount();
    await this.attachOrderCounts(items);
    return [items, total];
  }

  /**
   * Soft-delete a project. Blocked (leaf-first) while anything still points at
   * it — orders, lots, project-dedicated zones or tools. Otherwise those rows
   * would keep referencing a dead project (e.g. a zone dedicated to a deleted
   * project silently fails every stock-placement check afterwards).
   */
  async remove(id: string): Promise<void> {
    const project = await this.findOne(id); // 404 if it does not exist
    const [orderCount, lotCount, zoneCount, toolCount] = await Promise.all([
      this.orders.count({ where: { projectId: id } }),
      this.lots.count({ where: { projectId: id } }),
      this.zones.count({ where: { projectId: id } }),
      this.tools.count({ where: { projectId: id } }),
    ]);
    const blockers = [
      orderCount > 0 ? 'sipariş emirleri' : null,
      lotCount > 0 ? 'lotlar' : null,
      zoneCount > 0 ? 'bölgeler (zone)' : null,
      toolCount > 0 ? 'takımlar' : null,
    ].filter(Boolean);
    if (blockers.length > 0) {
      throw new ConflictException(
        `Bu proje silinemez: bağlı ${blockers.join(', ')} var. ` +
          'Önce bunları silin veya proje bağlantılarını kaldırın.',
      );
    }
    await this.repo.softRemove(project);
  }

  async findOne(id: string): Promise<Project> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Project ${id} not found`);
    found.orderCount = await this.orders.count({ where: { projectId: id } });
    return found;
  }

  /** Attach the (non-deleted) order count to each project for the delete gate. */
  private async attachOrderCounts(projects: Project[]): Promise<void> {
    if (!projects.length) return;
    const rows = await this.orders
      .createQueryBuilder('o')
      .select('o.project_id', 'projectId')
      .addSelect('COUNT(*)', 'count')
      .where('o.project_id IN (:...ids)', {
        ids: projects.map((p) => p.id),
      })
      .groupBy('o.project_id')
      .getRawMany<{ projectId: string; count: string }>();
    const map = new Map(rows.map((r) => [r.projectId, Number(r.count)]));
    for (const p of projects) p.orderCount = map.get(p.id) ?? 0;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    user?: User,
  ): Promise<Project> {
    // Editing the project itself is reserved to admins and its manager (the
    // manager need not be a team member). Non-member outsiders still get a
    // 404 (never leak existence); members without manager rights get a 403.
    const before = await this.findOne(id);
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      user.id !== before.managerUserId
    ) {
      if (!(await this.isMember(id, user.id))) {
        throw new NotFoundException(`Project ${id} not found`);
      }
      throw new ForbiddenException(
        'Only an admin or the project manager may edit this project',
      );
    }
    // Column-level update below so the eager manager/customer/contact
    // relations never re-write a cleared FK.
    // code is server-generated and immutable — drop any sent value.
    const { code: _code, ...rest } = dto;
    if (Object.keys(rest).length > 0) {
      await this.repo.update(id, rest);
    }
    if (
      dto.managerUserId !== undefined &&
      dto.managerUserId &&
      dto.managerUserId !== before.managerUserId
    ) {
      await this.notifications.notifyUser(
        dto.managerUserId,
        {
          type: NotificationType.Assignment,
          title: 'Proje yöneticiliği',
          message: `"${before.name}" projesine yönetici olarak atandınız.`,
          link: `/projects/${id}`,
          entityType: 'project',
          entityId: id,
        },
        user?.id,
      );
    }
    return this.findOne(id);
  }

  /** Find a project, enforcing membership for non-admin users. */
  async findOneForUser(id: string, user: User): Promise<Project> {
    const project = await this.findOne(id);
    if (!ProjectsService.isAdmin(user) && !(await this.isMember(id, user.id))) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  /** IDs of the projects the user is a member of (for sub-resource scoping). */
  async memberProjectIds(userId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId })
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  /** Is the user a member of the project that owns the given order? */
  async memberOfOrderProject(
    orderId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('p')
      .innerJoin('orders', 'o', 'o.project_id = p.id AND o.id = :orderId', {
        orderId,
      })
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm', 'm.id = :uid', { uid: userId })
      .where('p.id = :pid', { pid: projectId })
      .getCount();
    return count > 0;
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const project = await this.repo.findOne({
      where: { id: projectId },
      relations: { members: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project.members.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
  }

  /** Users not yet on the team (for the assignment dropdown). */
  async assignableUsers(projectId: string): Promise<ProjectMember[]> {
    const members = await this.listMembers(projectId);
    const memberIds = new Set(members.map((m) => m.id));
    const all = await this.users.find({ order: { name: 'ASC' } });
    return all
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  async addMember(projectId: string, userId: string): Promise<ProjectMember[]> {
    await this.findOne(projectId);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!(await this.isMember(projectId, userId))) {
      await this.repo
        .createQueryBuilder()
        .relation(Project, 'members')
        .of(projectId)
        .add(userId);
      const project = await this.findOne(projectId);
      await this.notifications.notifyUser(userId, {
        type: NotificationType.Assignment,
        title: 'Proje ekibi',
        message: `"${project.name}" projesine ekip üyesi olarak eklendiniz.`,
        link: `/projects/${projectId}`,
        entityType: 'project',
        entityId: projectId,
      });
    }
    return this.listMembers(projectId);
  }

  async removeMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember[]> {
    await this.findOne(projectId);
    await this.repo
      .createQueryBuilder()
      .relation(Project, 'members')
      .of(projectId)
      .remove(userId);
    return this.listMembers(projectId);
  }

  /** Contacts attached to the project. */
  async listContacts(
    projectId: string,
    user?: User,
  ): Promise<ProjectContact[]> {
    // Reads are manager/admin-only too; internal callers (addContact /
    // removeContact return values) pass no user — they already checked.
    if (user) await this.assertCustomerSettingsEditor(projectId, user);
    const project = await this.repo.findOne({
      where: { id: projectId },
      relations: { contacts: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project.contacts
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      )
      .map((c) => ProjectsService.toContactView(c));
  }

  /**
   * The customer's contacts not yet attached to the project (for the picker).
   * Empty if the project has no customer.
   */
  /**
   * The project's customer & contact sections (read AND write) are reserved
   * to admins and the project's manager — plain members see nothing here.
   * Non-member outsiders keep getting 404 (never leak existence); members
   * get an explicit 403.
   */
  private async assertCustomerSettingsEditor(
    projectId: string,
    user?: User,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (!(await this.isMember(projectId, user.id))) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const project = await this.findOne(projectId);
    if (project.managerUserId !== user.id) {
      throw new ForbiddenException(
        'Müşteri ve irtibat bölümünü yalnızca proje yöneticisi veya admin görüntüleyebilir ve yönetebilir.',
      );
    }
  }

  /**
   * The project's customer company + that customer's contact pool, for the
   * workspace Customer tab. Admin/manager only — served here (not via the
   * global /customers routes) so the manager needs no customers:read key.
   */
  async customerSection(
    projectId: string,
    user?: User,
  ): Promise<{ company: Customer | null; contacts: ProjectContact[] }> {
    await this.assertCustomerSettingsEditor(projectId, user);
    const project = await this.findOne(projectId);
    const company = project.customerCompany ?? null;
    const pool = company
      ? await this.contacts.find({
          where: { customerId: company.id },
          order: { firstName: 'ASC', lastName: 'ASC' },
        })
      : [];
    return {
      company,
      contacts: pool.map((c) => ProjectsService.toContactView(c)),
    };
  }

  /**
   * id/code/name of every customer — feeds the manager's "Set customer"
   * picker without requiring the global customers:read key.
   */
  async customerOptions(
    projectId: string,
    user?: User,
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    await this.assertCustomerSettingsEditor(projectId, user);
    const customers = await this.repo.manager.getRepository(Customer).find({
      select: { id: true, code: true, name: true },
      order: { code: 'ASC' },
    });
    return customers.map((c) => ({ id: c.id, code: c.code, name: c.name }));
  }

  async assignableContacts(
    projectId: string,
    user?: User,
  ): Promise<ProjectContact[]> {
    await this.assertCustomerSettingsEditor(projectId, user);
    const project = await this.repo.findOne({
      where: { id: projectId },
      relations: { contacts: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (!project.customerCompanyId) return [];
    const attached = new Set(project.contacts.map((c) => c.id));
    const pool = await this.contacts.find({
      where: { customerId: project.customerCompanyId },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    return pool
      .filter((c) => !attached.has(c.id))
      .map((c) => ProjectsService.toContactView(c));
  }

  async addContact(
    projectId: string,
    contactId: string,
    user?: User,
  ): Promise<ProjectContact[]> {
    await this.assertCustomerSettingsEditor(projectId, user);
    const project = await this.repo.findOne({
      where: { id: projectId },
      relations: { contacts: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    const contact = await this.contacts.findOne({ where: { id: contactId } });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);
    // A project contact must belong to the project's customer.
    if (
      !project.customerCompanyId ||
      contact.customerId !== project.customerCompanyId
    ) {
      throw new BadRequestException(
        'Contact does not belong to the project customer',
      );
    }
    if (!project.contacts.some((c) => c.id === contactId)) {
      await this.repo
        .createQueryBuilder()
        .relation(Project, 'contacts')
        .of(projectId)
        .add(contactId);
    }
    return this.listContacts(projectId);
  }

  async removeContact(
    projectId: string,
    contactId: string,
    user?: User,
  ): Promise<ProjectContact[]> {
    await this.assertCustomerSettingsEditor(projectId, user);
    await this.findOne(projectId);
    await this.repo
      .createQueryBuilder()
      .relation(Project, 'contacts')
      .of(projectId)
      .remove(contactId);
    return this.listContacts(projectId);
  }
}
