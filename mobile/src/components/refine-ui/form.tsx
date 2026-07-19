import type { ReactNode } from "react";
import { Switch, Text, View, type TextInputProps } from "react-native";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { type BaseRecord, type CrudFilter, useList, useSelect } from "@refinedev/core";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { colors } from "@/lib/theme";

export function FieldWrapper({
  label,
  error,
  required,
  hint,
  children,
}: {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      {label ? (
        <View className="flex-row">
          <Label>{label}</Label>
          {required ? <Text className="text-destructive"> *</Text> : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
}

type BaseFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  rules?: Omit<
    RegisterOptions<T, Path<T>>,
    "valueAsNumber" | "valueAsDate" | "setValueAs" | "disabled"
  >;
  hint?: string;
};

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  ...inputProps
}: BaseFieldProps<T> & TextInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <Input
            value={value != null ? String(value) : ""}
            onChangeText={onChange}
            onBlur={onBlur}
            {...inputProps}
          />
        </FieldWrapper>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  ...inputProps
}: BaseFieldProps<T> & TextInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <Input
            value={value != null ? String(value) : ""}
            onChangeText={(t) => {
              if (t.trim() === "") {
                onChange(undefined);
                return;
              }
              const n = Number(t.replace(",", "."));
              onChange(Number.isNaN(n) ? value : n);
            }}
            onBlur={onBlur}
            keyboardType="numeric"
            {...inputProps}
          />
        </FieldWrapper>
      )}
    />
  );
}

export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  ...inputProps
}: BaseFieldProps<T> & TextInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <Input
            value={value != null ? String(value) : ""}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={4}
            className="min-h-[88px] py-2.5"
            style={{ textAlignVertical: "top" }}
            {...inputProps}
          />
        </FieldWrapper>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            {label ? <Label>{label}</Label> : null}
            {hint ? (
              <Text className="text-xs text-muted-foreground">{hint}</Text>
            ) : null}
          </View>
          <Switch
            value={!!value}
            onValueChange={onChange}
            trackColor={{ false: colors.input, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  options,
  placeholder,
  allowClear,
}: BaseFieldProps<T> & {
  options: SelectOption[];
  placeholder?: string;
  allowClear?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <SearchableSelect
            value={value != null ? String(value) : null}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            allowClear={allowClear}
          />
        </FieldWrapper>
      )}
    />
  );
}

/** Multi-select checkbox group bound to an array field. */
export function CheckboxGroupField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  options,
}: BaseFieldProps<T> & { options: SelectOption[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => {
        const selected: string[] = Array.isArray(value) ? value : [];
        const toggle = (v: string) =>
          onChange(
            selected.includes(v)
              ? selected.filter((x) => x !== v)
              : [...selected, v],
          );
        return (
          <FieldWrapper label={label} hint={hint}>
            <View className="gap-0.5">
              {options.map((o) => (
                <Checkbox
                  key={o.value}
                  label={o.label}
                  checked={selected.includes(o.value)}
                  onPress={() => toggle(o.value)}
                />
              ))}
            </View>
          </FieldWrapper>
        );
      }}
    />
  );
}

/**
 * Relational picker that loads ALL records (pagination off) and builds option
 * labels via a custom function — for composite labels like
 * `{warehouse.code} / {zone.code} / {rack.code}`. Search is client-side.
 */
export function RelationSelectField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  resource,
  getLabel,
  filters,
  filterItem,
  placeholder,
  allowClear,
}: BaseFieldProps<T> & {
  resource: string;
  getLabel: (item: BaseRecord) => string;
  filters?: CrudFilter[];
  /** Client-side option filter (for rules the list endpoint can't express). */
  filterItem?: (item: BaseRecord) => boolean;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const { result } = useList<BaseRecord>({
    resource,
    pagination: { mode: "off" },
    filters,
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const options: SelectOption[] = (result?.data ?? [])
    .filter((item) => (filterItem ? filterItem(item) : true))
    .map((item) => ({
      label: getLabel(item),
      value: String(item.id),
    }));

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <SearchableSelect
            value={value != null ? String(value) : null}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            allowClear={allowClear}
          />
        </FieldWrapper>
      )}
    />
  );
}

/** Relational picker: loads options from a Refine resource with server search. */
export function ResourceSelectField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  hint,
  resource,
  optionLabel = "name",
  optionValue = "id",
  placeholder,
  allowClear,
}: BaseFieldProps<T> & {
  resource: string;
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const { options, onSearch } = useSelect({
    resource,
    optionLabel: optionLabel as never,
    optionValue: optionValue as never,
    pagination: { pageSize: 50, mode: "server" },
  });

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          error={error?.message}
          required={!!rules?.required}
          hint={hint}
        >
          <SearchableSelect
            value={value != null ? String(value) : null}
            onChange={onChange}
            options={options as SelectOption[]}
            onSearch={onSearch}
            placeholder={placeholder}
            allowClear={allowClear}
          />
        </FieldWrapper>
      )}
    />
  );
}
