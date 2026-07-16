import { useInvalidate, useNotification } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";

import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/providers/axios";

interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export function RolePermissionsEditor({
  roleId,
  roleName,
  initialPermissions,
}: {
  roleId: string;
  roleName: string;
  initialPermissions: string[];
}) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const isAdmin = roleName === "admin";

  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialPermissions),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void axiosInstance
      .get<PermissionDef[]>("/permissions")
      .then(({ data }) => setCatalog(data))
      .catch(() => setCatalog([]));
  }, []);

  // Keep selection in sync once the role record loads.
  useEffect(() => {
    setSelected(new Set(initialPermissions));
  }, [initialPermissions]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return [...map.entries()];
  }, [catalog]);

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.patch(`/roles/${roleId}/permissions`, {
        permissions: [...selected],
      });
      invalidate({ resource: "roles", invalidates: ["list", "detail"], id: roleId });
      open?.({
        type: "success",
        message: "Permissions updated",
        description: `Saved permissions for "${roleName}".`,
      });
    } catch {
      open?.({
        type: "error",
        message: "Could not update permissions",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Permissions</Label>
        {!isAdmin && (
          <Can perm="roles:update-permissions">
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save permissions"}
            </Button>
          </Can>
        )}
      </div>

      {isAdmin ? (
        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          The <strong>admin</strong> role has full access to everything. Its
          permissions cannot be changed.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([group, perms]) => (
            <div key={group} className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">{group}</p>
              <div className="space-y-2">
                {perms.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(p.key)}
                      onCheckedChange={(c) => toggle(p.key, c === true)}
                      className="mt-0.5"
                    />
                    <span>
                      {p.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.key}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Loading permissions…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
