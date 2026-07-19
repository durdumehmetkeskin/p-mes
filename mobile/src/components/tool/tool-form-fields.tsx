import { useEffect, useState } from "react";
import { type BaseRecord, useList } from "@refinedev/core";
import type { Control, FieldValues } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { Text, View } from "react-native";

import {
  FieldWrapper,
  NumberField,
  ResourceSelectField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { CustomerProjectFields } from "@/components/common/customer-project-fields";
import { TOOL_CATEGORIES, TOOL_STATUSES } from "@/components/tool/tool-constants";
import { labelRack, labelZone } from "@/lib/labels";

interface RackRow extends BaseRecord {
  zone?: { id?: string; projectId?: string | null } | null;
}
interface ZoneRow extends BaseRecord {
  projectId?: string | null;
}

export function ToolFormFields({ control }: { control: Control<FieldValues> }) {
  // Placement cascade: customer → project → the PROJECT's zone (auto when it
  // has exactly one) → a rack of that zone. A project tool cannot go into
  // another zone (backend enforces the same rule). Project-less tools keep the
  // free rack picker. The zone itself is UI-only (tools store rackId).
  const projectId = useWatch({ control, name: "projectId" }) as
    | string
    | null
    | undefined;
  const rack = useController({ control, name: "rackId", defaultValue: null });
  const rackValue = rack.field.value ? String(rack.field.value) : null;
  const [zoneId, setZoneId] = useState<string | null>(null);

  const { result: zonesRes } = useList<ZoneRow>({
    resource: "zones",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: racksRes } = useList<RackRow>({
    resource: "racks",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const allZones = zonesRes?.data ?? [];
  const allRacks = racksRes?.data ?? [];
  const projectZones = projectId
    ? allZones.filter((z) => String(z.projectId ?? "") === projectId)
    : [];

  // Edit case: seed the zone from the already-assigned rack.
  useEffect(() => {
    if (zoneId || !rackValue) return;
    const r = allRacks.find((x) => String(x.id) === rackValue);
    if (r?.zone?.id) setZoneId(String(r.zone.id));
  }, [zoneId, rackValue, allRacks]);
  // The project's only zone comes automatically.
  useEffect(() => {
    if (!projectId || zoneId) return;
    if (projectZones.length === 1) setZoneId(String(projectZones[0].id));
  }, [projectId, zoneId, projectZones]);
  // Project changed (or legacy mismatch): a zone outside the project resets
  // zone + rack.
  useEffect(() => {
    if (!projectId || !zoneId || !allZones.length) return;
    if (!projectZones.some((z) => String(z.id) === zoneId)) {
      setZoneId(null);
      rack.field.onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, zoneId, projectZones, allZones.length]);
  // Zone changed: a rack outside the zone resets.
  useEffect(() => {
    if (!zoneId || !rackValue) return;
    const r = allRacks.find((x) => String(x.id) === rackValue);
    if (r && String(r.zone?.id ?? "") !== zoneId) rack.field.onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, rackValue, allRacks]);

  const zoneOptions: SelectOption[] = projectZones.map((z) => ({
    value: String(z.id),
    label: labelZone(z),
  }));
  const rackOptions: SelectOption[] = (
    zoneId
      ? allRacks.filter((r) => String(r.zone?.id ?? "") === zoneId)
      : projectId
        ? []
        : allRacks
  ).map((r) => ({ value: String(r.id), label: labelRack(r) }));

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="code"
        label="Code"
        placeholder="TOOL-001"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <SelectField
        control={control}
        name="category"
        label="Category"
        options={[...TOOL_CATEGORIES]}
        placeholder="Select category"
        rules={{ required: "Category is required" }}
      />
      <SelectField
        control={control}
        name="status"
        label="Status"
        options={[...TOOL_STATUSES]}
      />
      <ResourceSelectField
        control={control}
        name="toolTypeId"
        label="Tool type"
        resource="tool-types"
        placeholder="Select a type"
        allowClear
      />
      <CustomerProjectFields control={control} />
      <TextField control={control} name="manufacturer" label="Manufacturer" />
      <TextField control={control} name="serialNumber" label="Serial number" />
      {projectId ? (
        <FieldWrapper label="Zone (project area)">
          <SearchableSelect
            value={zoneId}
            onChange={(v) => {
              setZoneId(v);
              rack.field.onChange(null);
            }}
            options={zoneOptions}
            placeholder={
              projectZones.length ? "Select zone" : "Projenin bölgesi yok"
            }
          />
          {allZones.length > 0 && projectZones.length === 0 ? (
            <Text className="mt-1 text-xs text-warning">
              Bu projenin bölgesi (zone) yok — önce projeye bir bölge
              tanımlayın.
            </Text>
          ) : null}
        </FieldWrapper>
      ) : null}
      <FieldWrapper label="Rack">
        <SearchableSelect
          value={rackValue}
          onChange={rack.field.onChange}
          options={rackOptions}
          placeholder={
            !projectId
              ? "Select rack (optional)"
              : zoneId
                ? "Select rack"
                : "Select a zone first"
          }
          allowClear={!projectId}
        />
        {projectId && zoneId && !rackValue ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            Projeye ait takım için bu bölgeden bir raf seçilmelidir.
          </Text>
        ) : null}
      </FieldWrapper>
      <NumberField control={control} name="quantity" label="Quantity" />
      <TextField
        control={control}
        name="purchaseDate"
        label="Purchase date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
