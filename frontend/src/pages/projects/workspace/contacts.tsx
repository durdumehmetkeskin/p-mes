import { useCreate, useNotification, useOne } from "@refinedev/core";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useOutletContext } from "react-router";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/providers/axios";
import { ConfirmDelete } from "./confirm-delete";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { usePermissions } from "@/hooks/use-permissions";
import type { ProjectContext } from "./project-workspace";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

type NewContactValues = {
  firstName: string;
  lastName: string;
  role?: string;
  email?: string;
  phone?: string;
};

/** Create a brand-new contact under the project's customer, then attach it. */
function NewContactDialog({
  customerId,
  onCreated,
}: {
  customerId: string;
  onCreated: (contactId: string) => Promise<void> | void;
}) {
  const { mutate } = useCreate();
  const { open: notify } = useNotification();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewContactValues>();

  const submit = (values: NewContactValues) =>
    new Promise<void>((resolve) => {
      mutate(
        { resource: "contacts", values: { ...values, customerId } },
        {
          onSuccess: async (data) => {
            const newId = (data?.data as { id?: string } | undefined)?.id;
            if (newId) await onCreated(newId);
            setOpen(false);
            reset();
            resolve();
          },
          onError: () => {
            notify?.({ type: "error", message: "Could not create the contact." });
            resolve();
          },
        },
      );
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          New contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New contact for this customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                {...register("firstName", { required: "First name is required" })}
              />
              {errors.firstName && (
                <span className="text-sm text-destructive">
                  {errors.firstName.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                {...register("lastName", { required: "Last name is required" })}
              />
              {errors.lastName && (
                <span className="text-sm text-destructive">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" {...register("role")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create & attach"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const ProjectContacts = () => {
  const { projectId, customerCompanyId } = useOutletContext<ProjectContext>();
  const { open: notify } = useNotification();

  // Customer settings (contact attach/detach) are reserved to admins and the
  // project's manager (backend mirrors with a 403); members are read-only.
  const { result: project } = useOne<{ managerUserId: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const canManageContacts = canEditProject(project?.managerUserId);
  const { has } = usePermissions();

  const [attached, setAttached] = useState<ContactRow[]>([]);
  const [candidates, setCandidates] = useState<ContactRow[]>([]);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    // Reads are manager/admin-only on the backend too — don't even try
    // for plain members (the section renders a notice instead).
    if (!projectId || !canManageContacts) return;
    const [a, c] = await Promise.all([
      axiosInstance
        .get<ContactRow[]>(`/projects/${projectId}/contacts`)
        .catch(() => ({ data: [] as ContactRow[] })),
      axiosInstance
        .get<ContactRow[]>(`/projects/${projectId}/assignable-contacts`)
        .catch(() => ({ data: [] as ContactRow[] })),
    ]);
    setAttached(a.data);
    setCandidates(c.data);
  }, [projectId, canManageContacts]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const attach = useCallback(
    async (contactId: string) => {
      setBusy(true);
      try {
        await axiosInstance.post(`/projects/${projectId}/contacts`, {
          contactId,
        });
        setPicked("");
        await refresh();
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Could not attach the contact.";
        notify?.({ type: "error", message: String(msg) });
      } finally {
        setBusy(false);
      }
    },
    [projectId, refresh, notify],
  );

  const detach = async (contactId: string) => {
    await axiosInstance.delete(`/projects/${projectId}/contacts/${contactId}`);
    await refresh();
  };

  if (!canManageContacts) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Bu bölümü yalnızca proje yöneticisi veya admin görüntüleyebilir.
        </CardContent>
      </Card>
    );
  }

  if (!customerCompanyId) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Assign a customer to this project to manage its contacts.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Contacts ({attached.length})</span>
          {canManageContacts && (
            <div className="flex items-center gap-2">
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a customer contact…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length ? (
                    candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                        {c.role ? ` · ${c.role}` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No more contacts to add
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!picked || busy}
                onClick={() => void attach(picked)}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Attach
              </Button>
              {has("contacts:create") && (
                <NewContactDialog
                  customerId={customerCompanyId}
                  onCreated={(id) => attach(id)}
                />
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Only the contacts attached here belong to this project — pick from the
          customer's contacts or create a new one.
        </p>
        {attached.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Phone</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attached.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="py-2">{c.role ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="py-2">
                    <StatusBadge
                      tone={c.isActive ? "success" : "neutral"}
                      label={c.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end">
                      {canManageContacts && (
                        <ConfirmDelete
                          title="Remove from project?"
                          description={`"${c.firstName} ${c.lastName}" will be detached from this project. The contact itself is kept.`}
                          onConfirm={() => void detach(c.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contacts attached to this project yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
