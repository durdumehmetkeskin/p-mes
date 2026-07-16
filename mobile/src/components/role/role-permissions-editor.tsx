import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/use-permissions";
import { axiosInstance } from "@/providers/axios";

interface PermDef {
  key: string;
  label: string;
  group: string;
}

/**
 * Grouped permission checklist. Saves via the dedicated
 * PATCH /roles/:id/permissions endpoint (separate from the role update body).
 */
export function RolePermissionsEditor({
  roleId,
  roleName,
  initialPermissions,
}: {
  roleId: string;
  roleName: string;
  initialPermissions: string[];
}) {
  const invalidate = useInvalidate();
  const { ready, has } = usePermissions();
  const [defs, setDefs] = useState<PermDef[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialPermissions),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get<PermDef[]>("/permissions")
      .then((r) => setDefs(r.data ?? []))
      .catch(() => setDefs([]));
  }, []);

  useEffect(() => {
    setSelected(new Set(initialPermissions));
  }, [initialPermissions.join(",")]);

  if (roleName === "admin") {
    return (
      <View className="rounded-lg border border-border bg-card p-4">
        <Text className="text-sm text-muted-foreground">
          The admin role has full access and cannot be changed.
        </Text>
      </View>
    );
  }

  const groups: Record<string, PermDef[]> = {};
  defs.forEach((d) => {
    (groups[d.group] ??= []).push(d);
  });

  const toggle = (k: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.patch(`/roles/${roleId}/permissions`, {
        permissions: [...selected],
      });
      invalidate({ resource: "roles", invalidates: ["list", "detail"], id: roleId });
      toast.success("Permissions updated");
    } catch {
      toast.error("Could not save permissions");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !ready || has("roles:update-permissions");

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
        Permissions
      </Text>
      {Object.entries(groups).map(([group, items]) => (
        <View key={group} className="rounded-lg border border-border bg-card p-3">
          <Text className="mb-1 text-xs font-sans-semibold text-foreground">
            {group}
          </Text>
          {items.map((d) => (
            <Checkbox
              key={d.key}
              checked={selected.has(d.key)}
              onPress={() => toggle(d.key)}
              label={
                <View className="flex-1">
                  <Text className="text-sm text-foreground">{d.label}</Text>
                  <Text className="font-mono text-[11px] text-muted-foreground">
                    {d.key}
                  </Text>
                </View>
              }
            />
          ))}
        </View>
      ))}
      {canSave ? (
        <Button label="Save permissions" loading={saving} onPress={save} />
      ) : null}
    </View>
  );
}
