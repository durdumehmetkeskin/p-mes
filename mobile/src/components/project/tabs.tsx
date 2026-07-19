import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  type BaseRecord,
  useDelete,
  useInvalidate,
  useList,
  useOne,
} from "@refinedev/core";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { axiosInstance } from "@/providers/axios";

import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { Can } from "@/components/can";
import { confirm, confirmDelete } from "@/components/refine-ui/confirm";
import { EmptyState } from "@/components/refine-ui/empty-state";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { humanizeStatus } from "@/components/project/detail-config";
import { useProjectContacts } from "@/components/project/use-project-contacts";
import { useTeamMembers } from "@/components/project/use-team-members";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { usePermissions } from "@/hooks/use-permissions";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

// ------- shared card -------
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
    >
      <Icon icon={Plus} size={18} color={colors.foreground} />
    </Pressable>
  );
}

function RowDelete({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
    >
      <Icon icon={Trash2} size={16} color={colors.destructive} />
    </Pressable>
  );
}

// ------- Overview -------
export function OverviewTab({ project }: { project?: BaseRecord }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="rounded-lg border border-border bg-card p-4">
        <SectionLabel>Project</SectionLabel>
        <FieldRow label="Code" value={project?.code} mono />
        <FieldRow label="Name" value={project?.name} />
        <FieldRow label="Manager" value={project?.managerUser?.name} />
        <FieldRow label="Customer" value={project?.customerCompany?.name} />
        <FieldRow
          label="Contact"
          value={
            project?.contactPerson
              ? `${project.contactPerson.firstName ?? ""} ${project.contactPerson.lastName ?? ""}`.trim()
              : undefined
          }
        />
        <FieldRow label="Status" value={humanizeStatus(project?.status)} />
        <FieldRow label="Start" value={project?.startDate} />
        <FieldRow label="End" value={project?.endDate} />
        {project?.description ? (
          <FieldRow label="Description" value={project.description} />
        ) : null}
      </View>
    </ScrollView>
  );
}

// ------- Customer -------
// Served via the project-scoped endpoint (admin/manager only) so the manager
// needs no global customers:read key. The tab itself is hidden from members.
export function CustomerTab({
  projectId,
  customerCompanyId,
}: {
  projectId: string;
  customerCompanyId: string | null;
}) {
  const [c, setC] = useState<BaseRecord | null>(null);
  useEffect(() => {
    if (!projectId) return;
    axiosInstance
      .get<{ company: BaseRecord | null }>(`/projects/${projectId}/customer`)
      .then((r) => setC(r.data.company))
      .catch(() => setC(null));
  }, [projectId, customerCompanyId]);
  if (!customerCompanyId) {
    return <EmptyState title="No customer" message="This project has no linked customer." />;
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="rounded-lg border border-border bg-card p-4">
        <SectionLabel>Customer</SectionLabel>
        <FieldRow label="Code" value={c?.code} mono />
        <FieldRow label="Name" value={c?.name} />
        <FieldRow label="Tax number" value={c?.taxNumber} />
        <FieldRow label="Email" value={c?.email} />
        <FieldRow label="Phone" value={c?.phone} />
        <FieldRow label="Address" value={c?.address} />
      </View>
    </ScrollView>
  );
}

// ------- Contacts (project subset of the customer's contacts) -------
export function ContactsTab({
  projectId,
  customerCompanyId,
}: {
  projectId: string;
  customerCompanyId: string | null;
}) {
  const router = useRouter();
  const { contacts, assignable, attach, detach } = useProjectContacts(projectId);
  // Customer settings (contact attach/detach) are reserved to admins and the
  // project's manager (backend mirrors with a 403); members are read-only.
  const { result: contactsProject } = useOne<{ managerUserId?: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const canManageContacts = canEditProject(contactsProject?.managerUserId);

  if (!customerCompanyId) {
    return <EmptyState title="No customer" message="Link a customer to manage contacts." />;
  }

  const contactName = (c: { firstName?: string; lastName?: string }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ");

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card
        title={`Contacts${contacts.length ? ` (${contacts.length})` : ""}`}
        action={
          canManageContacts ? (
            <View className="flex-row items-center gap-1">
              <ActionMenu
                title="Attach contact"
                options={assignable.map((c) => ({
                  label:
                    contactName(c) + (c.role ? ` · ${c.role}` : ""),
                  onPress: () => {
                    void attach(c.id);
                  },
                }))}
                trigger={(open) => (
                  <Pressable
                    onPress={open}
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                  >
                    <Icon icon={UserPlus} size={18} color={colors.foreground} />
                  </Pressable>
                )}
              />
              <Can resource="contacts" action="create">
                <AddButton
                  onPress={() =>
                    router.push(
                      `/projects/${projectId}/contact-new?companyId=${customerCompanyId}`,
                    )
                  }
                />
              </Can>
            </View>
          ) : null
        }
      >
        {contacts.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">
            No contacts. Attach an existing one or add a new contact.
          </Text>
        ) : (
          contacts.map((c, i) => (
            <View
              key={c.id}
              className={i > 0 ? "flex-row items-center justify-between border-t border-border p-3" : "flex-row items-center justify-between p-3"}
            >
              <View className="flex-1">
                <Text className="text-sm text-foreground">{contactName(c)}</Text>
                <Text className="text-xs text-muted-foreground">
                  {[c.role, c.email].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {canManageContacts && (
                <RowDelete
                  onPress={() =>
                    confirm({
                      title: "Remove from project?",
                      confirmLabel: "Remove",
                      destructive: true,
                      onConfirm: () => {
                        void detach(c.id);
                      },
                    })
                  }
                />
              )}
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

// ------- Team -------
export function TeamTab({ projectId }: { projectId: string }) {
  const { members, assignable, addMember, removeMember } = useTeamMembers(projectId);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card
        title={`Team${members.length ? ` (${members.length})` : ""}`}
        action={
          <Can resource="projects" action="manage-members">
            <ActionMenu
              title="Add member"
              options={assignable.map((u) => ({
                label: `${u.name ?? u.id}${u.email ? ` · ${u.email}` : ""}`,
                onPress: () => addMember(u.id),
              }))}
              trigger={(open) => (
                <Pressable
                  onPress={open}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                >
                  <Icon icon={UserPlus} size={18} color={colors.foreground} />
                </Pressable>
              )}
            />
          </Can>
        }
      >
        {members.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No team members</Text>
        ) : (
          members.map((m, i) => (
            <View
              key={m.id}
              className={i > 0 ? "flex-row items-center justify-between border-t border-border p-3" : "flex-row items-center justify-between p-3"}
            >
              <View className="flex-1">
                <Text className="text-sm text-foreground">{m.name}</Text>
                <Text className="text-xs text-muted-foreground">{m.email}</Text>
              </View>
              <Can resource="projects" action="manage-members">
                <RowDelete
                  onPress={() =>
                    confirm({
                      title: "Remove member?",
                      confirmLabel: "Remove",
                      destructive: true,
                      onConfirm: () => removeMember(m.id),
                    })
                  }
                />
              </Can>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

// ------- Workflow (templates list + builder) -------
export function WorkflowTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const { mutate: removeTpl } = useDelete();
  const { result } = useList<BaseRecord>({
    resource: "workflow-templates",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const rows = result?.data ?? [];

  const duplicate = async (tplId: string) => {
    try {
      await axiosInstance.post(`/workflow-templates/${tplId}/duplicate`, {
        projectId,
      });
      invalidate({ resource: "workflow-templates", invalidates: ["list"] });
      toast.success("Template duplicated");
    } catch {
      toast.error("Duplicate failed");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card
        title={`Workflow templates${rows.length ? ` (${rows.length})` : ""}`}
        action={
          <Can resource="workflow-templates" action="create">
            <AddButton onPress={() => router.push(`/projects/${projectId}/workflow-new`)} />
          </Can>
        }
      >
        {rows.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No templates</Text>
        ) : (
          rows.map((t, i) => {
            const owned = !!t.projectId;
            return (
              <View
                key={t.id}
                className={i > 0 ? "flex-row items-center gap-2 border-t border-border p-3" : "flex-row items-center gap-2 p-3"}
              >
                <Pressable
                  className="flex-1"
                  disabled={!owned}
                  onPress={() =>
                    router.push(`/projects/${projectId}/workflow-new?editId=${t.id}`)
                  }
                >
                  <Text className="text-sm text-foreground">{t.name}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t.stages?.length ?? 0} stages
                  </Text>
                </Pressable>
                {!owned ? (
                  <Badge variant="outline">
                    {t.isSystemDefault ? "system" : "global"}
                  </Badge>
                ) : null}
                <Can resource="workflow-templates" action="create">
                  <Pressable
                    onPress={() => duplicate(t.id as string)}
                    hitSlop={6}
                    className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                  >
                    <Icon icon={Copy} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </Can>
                {owned ? (
                  <Can resource="workflow-templates" action="delete">
                    <RowDelete
                      onPress={() =>
                        confirmDelete(String(t.name ?? "template"), () =>
                          removeTpl({ resource: "workflow-templates", id: t.id as string }),
                        )
                      }
                    />
                  </Can>
                ) : null}
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

// ------- Orders -------
export function OrdersTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { result } = useList<BaseRecord>({
    resource: "orders",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const rows = result?.data ?? [];
  // Creating an order is reserved to admins and the project's manager
  // (backend mirrors with a 403).
  const { result: ordersProject } = useOne<{ managerUserId?: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const canManageOrders = canEditProject(ordersProject?.managerUserId);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card
        title={`Orders${rows.length ? ` (${rows.length})` : ""}`}
        action={
          canManageOrders ? (
            <AddButton onPress={() => router.push(`/projects/${projectId}/order-new`)} />
          ) : null
        }
      >
        {rows.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No orders</Text>
        ) : (
          rows.map((o, i) => (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/projects/${projectId}/orders/${o.id}`)}
              className={i > 0 ? "flex-row items-center justify-between border-t border-border p-3 active:bg-accent" : "flex-row items-center justify-between p-3 active:bg-accent"}
            >
              <View className="flex-1">
                <Text className="font-sans-medium text-sm text-foreground">
                  {o.orderNumber}
                </Text>
                {o.name ? (
                  <Text className="text-xs text-muted-foreground">{o.name}</Text>
                ) : null}
              </View>
              {o.status ? (
                <Text className="text-xs text-muted-foreground">
                  {humanizeStatus(o.status)}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

export function FilesTab({ projectId }: { projectId: string }) {
  // Project files are managed only by an admin or the project's manager
  // (backend mirrors with a 403); members read/download only.
  const { result: project } = useOne<{ managerUserId?: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const { has } = usePermissions();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AttachmentsPanel
        ownerType="project"
        ownerId={projectId}
        canUpload={
          canEditProject(project?.managerUserId) && has("attachments:create")
        }
      />
    </ScrollView>
  );
}

interface AllocMaterial {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  reorderLevel?: number | null;
  // Freely-available project stock (not reserved).
  available?: number;
}
interface AllocTool {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  quantity?: number;
  rack?: { code?: string } | null;
}
interface DemandOrderRow {
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  required: number;
  covered: number;
  remaining: number;
}
interface DemandRow {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  requiredTotal: number;
  remainingTotal: number;
  available: number;
  missing: number;
  orders: DemandOrderRow[];
}

export function InventoryTab({ projectId }: { projectId: string }) {
  const [materialRows, setMaterialRows] = useState<AllocMaterial[]>([]);
  const [toolRows, setToolRows] = useState<AllocTool[]>([]);
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    void Promise.all([
      axiosInstance
        .get<AllocMaterial[]>(`/projects/${projectId}/materials`)
        .then((r) => r.data)
        .catch(() => [] as AllocMaterial[]),
      axiosInstance
        .get<AllocTool[]>(`/projects/${projectId}/tools`)
        .then((r) => r.data)
        .catch(() => [] as AllocTool[]),
      axiosInstance
        .get<DemandRow[]>(`/projects/${projectId}/material-demands`)
        .then((r) => r.data)
        .catch(() => [] as DemandRow[]),
    ]).then(([m, t, d]) => {
      if (!active) return;
      setMaterialRows(m ?? []);
      setToolRows(t ?? []);
      setDemands(d ?? []);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  const router = useRouter();
  const row = (i: number) =>
    i > 0
      ? "flex-row items-center justify-between border-t border-border p-3 active:bg-accent"
      : "flex-row items-center justify-between p-3 active:bg-accent";

  const toggleDemand = (id: string) =>
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {demands.length > 0 ? (
        <Card title={`Demand list (${demands.length})`}>
          {demands.map((d, i) => {
            const expanded = expandedDemands.has(d.materialId);
            return (
              <View key={d.materialId}>
                <Pressable
                  className={row(i)}
                  onPress={() => toggleDemand(d.materialId)}
                >
                  <Icon
                    icon={expanded ? ChevronDown : ChevronRight}
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <View className="flex-1 px-2">
                    <Text className="font-sans-medium text-sm text-foreground">
                      {d.name}
                    </Text>
                    <Text className="font-mono text-xs text-muted-foreground">
                      {d.code}
                    </Text>
                  </View>
                  <Text
                    className="mr-1 font-mono text-sm"
                    style={{ color: colors.destructive }}
                  >
                    −{String(d.missing)} {d.unit}
                  </Text>
                  <Icon
                    icon={AlertTriangle}
                    size={16}
                    color={colors.destructive}
                  />
                </Pressable>
                {expanded
                  ? d.orders.map((o) => (
                      <Pressable
                        key={o.orderId}
                        className="flex-row items-center justify-between border-t border-border bg-muted/20 py-2 pl-10 pr-3 active:bg-accent"
                        onPress={() =>
                          router.push(
                            `/projects/${projectId}/orders/${o.orderId}`,
                          )
                        }
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm text-foreground">
                            {o.orderNumber}
                            {o.orderName ? ` · ${o.orderName}` : ""}
                          </Text>
                          <Text className="font-mono text-xs text-muted-foreground">
                            required {String(o.required)} · reserved{" "}
                            {String(o.covered)}
                          </Text>
                        </View>
                        <Text
                          className="font-mono text-sm"
                          style={{ color: colors.destructive }}
                        >
                          {String(o.remaining)} {d.unit}
                        </Text>
                      </Pressable>
                    ))
                  : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card
        title={`Materials${materialRows.length ? ` (${materialRows.length})` : ""}`}
      >
        {materialRows.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No materials</Text>
        ) : (
          materialRows.map((m, i) => {
            const reorder = Number(m.reorderLevel ?? 0);
            const low = reorder > 0 && Number(m.available ?? 0) < reorder;
            return (
              <Pressable
                key={m.id}
                className={row(i)}
                onPress={() =>
                  router.push(`/projects/${projectId}/material/${m.id}`)
                }
              >
                <View className="flex-1 pr-2">
                  <Text className="font-sans-medium text-sm text-foreground">
                    {String(m.name ?? "")}
                  </Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {String(m.code ?? "")}
                    {reorder > 0 ? ` · reorder ${reorder}` : ""}
                  </Text>
                </View>
                <Text
                  className="font-mono text-sm"
                  style={{ color: low ? colors.destructive : colors.foreground }}
                >
                  {String(m.available ?? 0)} {String(m.unit ?? "")}
                </Text>
              </Pressable>
            );
          })
        )}
      </Card>

      <Card title={`Tools${toolRows.length ? ` (${toolRows.length})` : ""}`}>
        {toolRows.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No tools</Text>
        ) : (
          toolRows.map((t, i) => (
            <Pressable
              key={t.id}
              className={row(i)}
              onPress={() => router.push(`/tools/${t.id}`)}
            >
              <View className="flex-1 pr-2">
                <Text className="font-sans-medium text-sm text-foreground">
                  {String(t.name ?? "")}
                </Text>
                <Text className="font-mono text-xs text-muted-foreground">
                  {String(t.code ?? "")}
                  {t.status ? ` · ${humanizeStatus(t.status)}` : ""}
                </Text>
              </View>
              <Text className="font-mono text-sm text-foreground">
                {String(t.quantity ?? "")}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

export function PlaceholderTab({ title, note }: { title: string; note: string }) {
  return <EmptyState title={title} message={note} />;
}
