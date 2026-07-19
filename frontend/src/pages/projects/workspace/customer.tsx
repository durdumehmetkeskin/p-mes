import {
  useCreate,
  useInvalidate,
  useOne,
  useUpdate,
} from "@refinedev/core";
import { useEffect, useState } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useOutletContext } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { usePermissions } from "@/hooks/use-permissions";
import { axiosInstance } from "@/providers/axios";
import { CustomerFormFields } from "../../customers/customer-form-fields";
import type { ProjectContext } from "./project-workspace";

type FormValues = Record<string, unknown>;

interface CompanyRecord {
  id: string;
  code: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}
interface CompanyOpt {
  id: string;
  code: string;
  name: string;
}
interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

function SetCustomerDialog({
  projectId,
  current,
}: {
  projectId: string;
  current: string | null;
}) {
  const { mutate: updateProject } = useUpdate();
  const { mutate: createCompany } = useCreate();
  const invalidate = useInvalidate();
  const { has } = usePermissions();
  // Options come from the project-scoped endpoint so a non-admin manager
  // needs no global customers:read key.
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  useEffect(() => {
    axiosInstance
      .get<CompanyOpt[]>(`/projects/${projectId}/customer-options`)
      .then((r) => setCompanies(r.data))
      .catch(() => setCompanies([]));
  }, [projectId]);
  // Creating a brand-new customer needs the global customers:create key.
  const canCreateCompany = has("customers:create");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selected, setSelected] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const refresh = () => {
    invalidate({ resource: "projects", invalidates: ["detail"], id: projectId });
    invalidate({ resource: "customers", invalidates: ["list"] });
    setOpen(false);
  };

  const assign = (companyId: string) =>
    updateProject(
      { resource: "projects", id: projectId, values: { customerCompanyId: companyId } },
      { onSuccess: refresh },
    );

  const createAndAssign = (values: FormValues) =>
    new Promise<void>((resolve) => {
      createCompany(
        { resource: "customers", values },
        {
          onSuccess: (data) => {
            const newId = (data?.data as { id?: string } | undefined)?.id;
            if (newId) assign(newId);
            reset();
            resolve();
          },
          onError: () => resolve(),
        },
      );
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setMode("existing");
          setSelected("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {current ? "Change customer" : "Set customer"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {current ? "Change customer" : "Set customer"}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "existing" ? "default" : "outline"}
            onClick={() => setMode("existing")}
          >
            Existing
          </Button>
          {canCreateCompany && (
            <Button
              type="button"
              size="sm"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
            >
              New customer
            </Button>
          )}
        </div>

        {mode === "existing" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Customer</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button disabled={!selected} onClick={() => assign(selected)}>
                Assign
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(createAndAssign)} className="space-y-6">
            <CustomerFormFields
              register={register as unknown as UseFormRegister<FormValues>}
              control={control as unknown as Control<FormValues>}
              errors={errors as FieldErrors<FormValues>}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Create & assign"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const ProjectCustomer = () => {
  const { projectId, customerCompanyId } = useOutletContext<ProjectContext>();

  // The Customer section is visible ONLY to admins and the project's manager
  // (backend serves it via /projects/:id/customer with the same rule).
  const { result: project } = useOne<{ managerUserId: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const canManageCustomer = canEditProject(project?.managerUserId);

  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [contactRows, setContactRows] = useState<ContactRow[]>([]);
  useEffect(() => {
    if (!projectId || !canManageCustomer) return;
    axiosInstance
      .get<{ company: CompanyRecord | null; contacts: ContactRow[] }>(
        `/projects/${projectId}/customer`,
      )
      .then((r) => {
        setCompany(r.data.company);
        setContactRows(r.data.contacts);
      })
      .catch(() => {
        setCompany(null);
        setContactRows([]);
      });
  }, [projectId, canManageCustomer, customerCompanyId]);

  if (!canManageCustomer) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Bu bölümü yalnızca proje yöneticisi veya admin görüntüleyebilir.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Customer</span>
            {canManageCustomer && (
              <SetCustomerDialog
                projectId={projectId}
                current={customerCompanyId}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!customerCompanyId ? (
            <p className="text-sm text-muted-foreground">
              No customer assigned. Use “Set customer” to pick or create one.
            </p>
          ) : company ? (
            <>
              <Field label="Code">{company.code}</Field>
              <Field label="Name">{company.name}</Field>
              <Field label="Tax number">{company.taxNumber ?? "—"}</Field>
              <Field label="Email">{company.email ?? "—"}</Field>
              <Field label="Phone">{company.phone ?? "—"}</Field>
              <Field label="Address">{company.address ?? "—"}</Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>

      {customerCompanyId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contactRows.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {contactRows.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="py-2">{c.role ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">
                        {c.email ?? "—"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {c.phone ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No contacts.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
