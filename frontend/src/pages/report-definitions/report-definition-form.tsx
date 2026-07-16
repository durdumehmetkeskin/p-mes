import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";

import {
  CreateView,
  CreateViewHeader,
} from "@/components/refine-ui/views/create-view";
import {
  EditView,
  EditViewHeader,
} from "@/components/refine-ui/views/edit-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const DATA_SOURCES = [
  { value: "project-production", label: "Project Production" },
  { value: "work-order", label: "Work Order Detail" },
  { value: "workload", label: "Workload / Utilisation" },
  { value: "inventory-tooling", label: "Inventory & Tooling" },
];

const RECIPES = [
  { value: "chrome-pdf", label: "PDF (chrome-pdf)" },
  { value: "html-to-xlsx", label: "Excel (html-to-xlsx)" },
  { value: "html-embedded-in-docx", label: "Word (html-embedded-in-docx)" },
];

interface ReportDefinitionRecord {
  isSystem?: boolean;
  key?: string;
}

export function ReportDefinitionForm({ action }: { action: "create" | "edit" }) {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: { resource: "report-definitions", action },
    defaultValues: {
      key: "",
      name: "",
      description: "",
      dataSource: "",
      recipe: "chrome-pdf",
      engine: "handlebars",
      isActive: true as boolean,
      content: "",
      helpers: "",
    },
  });

  const record = query?.data?.data as ReportDefinitionRecord | undefined;
  const isSystem = Boolean(record?.isSystem);

  const body = (
    <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          {action === "create" ? (
            <>
              <Input
                id="key"
                placeholder="my-report"
                {...register("key", {
                  required: "Key is required",
                  pattern: {
                    value: /^[a-z][a-z0-9_-]*$/,
                    message: "Lowercase slug (letters, digits, - and _)",
                  },
                })}
              />
              {errors.key && (
                <span className="text-sm text-destructive">
                  {String(errors.key.message)}
                </span>
              )}
            </>
          ) : (
            <Input id="key" value={record?.key ?? ""} disabled />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <span className="text-sm text-destructive">
              {String(errors.name.message)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Data source</Label>
          <Controller
            control={control}
            name="dataSource"
            rules={{ required: "Data source is required" }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.dataSource && (
            <span className="text-sm text-destructive">
              {String(errors.dataSource.message)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Default format</Label>
          <Controller
            control={control}
            name="recipe"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a format" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Template (Handlebars / HTML)</Label>
        <Textarea
          id="content"
          rows={18}
          className="font-mono text-xs"
          spellCheck={false}
          {...register("content", { required: "Template content is required" })}
        />
        {errors.content && (
          <span className="text-sm text-destructive">
            {String(errors.content.message)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="helpers">
          Helpers (optional JS — extra Handlebars helpers)
        </Label>
        <Textarea
          id="helpers"
          rows={6}
          className="font-mono text-xs"
          spellCheck={false}
          {...register("helpers")}
        />
        <p className="text-xs text-muted-foreground">
          Built-in helpers: formatDate, formatDateTime, formatNumber, percent,
          eq, gt, or, defaultTo.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={formLoading}>
          {formLoading
            ? "Saving…"
            : action === "create"
              ? "Create"
              : "Save"}
        </Button>
      </div>
    </form>
  );

  if (action === "create") {
    return (
      <CreateView>
        <CreateViewHeader title="New Report Template" />
        {body}
      </CreateView>
    );
  }
  return (
    <EditView>
      <EditViewHeader title="Edit Report Template" />
      {body}
    </EditView>
  );
}
