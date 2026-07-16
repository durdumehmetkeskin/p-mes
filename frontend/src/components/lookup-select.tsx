import { useCreate, useInvalidate, useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { UnitNameInput } from "@/components/unit-name-input";

// Sentinel for "no selection" (Radix Select disallows empty-string values).
const NONE = "__none__";

interface LookupOption {
  id: string;
  name: string;
}

type FormValues = Record<string, unknown>;

interface LookupSelectProps {
  control: Control<FormValues>;
  /** Form field holding the lookup id (e.g. "materialUnitId"). */
  name: string;
  label: string;
  /** Refine resource backing the options (e.g. "material-units"). */
  resource: string;
  dialogTitle: string;
  placeholder?: string;
  namePlaceholder?: string;
  /** Offer a "— None —" item and store null (default true). */
  allowNone?: boolean;
  required?: boolean;
  /** Preselect the option with this name while the field is empty. */
  defaultName?: string;
  /** Minimum dialog name length (mirror the backend DTO). */
  minNameLength?: number;
  /** Use the unit-notation name editor (exponents, indices, ·, fractions). */
  unitNotation?: boolean;
}

/**
 * Lookup picker with an inline "new entry" creator, so a missing option can be
 * added without leaving the host form (material types, material units, ...).
 */
export function LookupSelect({
  control,
  name,
  label,
  resource,
  dialogTitle,
  placeholder = "Select...",
  namePlaceholder,
  allowNone = true,
  required = false,
  defaultName,
  minNameLength = 2,
  unitNotation = false,
}: LookupSelectProps) {
  const { result } = useList<LookupOption>({
    resource,
    pagination: { mode: "off" },
  });
  const options = result?.data ?? [];

  const { field } = useController({
    name,
    control,
    defaultValue: null,
    rules: { required },
  });

  // Preselect the default option once options arrive and nothing is chosen yet
  // (edit forms hydrate the field before/after this and win either way).
  const empty = !field.value;
  useEffect(() => {
    if (!defaultName || !empty || !options.length) return;
    const match = options.find((o) => o.name === defaultName) ?? options[0];
    field.onChange(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName, empty, options.length]);

  const invalidate = useInvalidate();
  const { mutate: createEntry } = useCreate();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <Select
          value={field.value ? String(field.value) : allowNone ? NONE : ""}
          onValueChange={(v) => field.onChange(v === NONE ? null : v)}
        >
          <SelectTrigger id={name} className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowNone && <SelectItem value={NONE}>— None —</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={dialogTitle}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${name}-newName`}>Name</Label>
                {unitNotation ? (
                  <UnitNameInput
                    id={`${name}-newName`}
                    placeholder={namePlaceholder}
                    value={newName}
                    onChange={setNewName}
                  />
                ) : (
                  <Input
                    id={`${name}-newName`}
                    placeholder={namePlaceholder}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${name}-newDesc`}>Description</Label>
                <Textarea
                  id={`${name}-newDesc`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={creating || newName.trim().length < minNameLength}
                  onClick={() => {
                    setCreating(true);
                    createEntry(
                      {
                        resource,
                        values: {
                          name: newName.trim(),
                          description: description || undefined,
                        },
                      },
                      {
                        onSuccess: (res) => {
                          invalidate({ resource, invalidates: ["list"] });
                          // Select the freshly created entry.
                          field.onChange((res.data as { id: string }).id);
                          setOpen(false);
                          setNewName("");
                          setDescription("");
                          setCreating(false);
                        },
                        onError: () => setCreating(false),
                      },
                    );
                  }}
                >
                  {creating ? "Creating..." : "Create & select"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
