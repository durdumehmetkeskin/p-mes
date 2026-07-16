import { useDelete, useInvalidate, useList } from "@refinedev/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryDialog, type CategoryRecord } from "./category-manager";
import type { ProjectContext } from "./project-workspace";

export const ProjectCategories = () => {
  const { projectId } = useOutletContext<ProjectContext>();
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();
  const { result } = useList<CategoryRecord>({
    resource: "stage-type-categories",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const rows = result?.data ?? [];

  const refresh = () =>
    invalidate({ resource: "stage-type-categories", invalidates: ["list"] });

  const onDelete = (id: string) =>
    remove({ resource: "stage-type-categories", id }, { onSuccess: refresh });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Stage categories</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} total
            </span>
            <CategoryDialog
              projectId={projectId}
              onSaved={refresh}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  New category
                </Button>
              }
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Specific to this project. Global entries are shared and read-only here.
          A stage type can only be added to a workflow of the same category.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Scope</th>
              <th className="pb-2 font-medium">Order</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const owned = c.projectId === projectId;
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{c.code}</td>
                  <td className="py-2">{c.name}</td>
                  <td className="py-2">
                    {owned ? (
                      <Badge variant="secondary">project</Badge>
                    ) : (
                      <Badge variant="outline">global</Badge>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{c.sortOrder}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      {owned ? (
                        <>
                          <CategoryDialog
                            record={c}
                            projectId={projectId}
                            onSaved={refresh}
                            trigger={
                              <Button size="icon" variant="outline">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => onDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
