import {
  useApiUrl,
  useCustomMutation,
  useDelete,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useOutletContext } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectContext } from "./project-workspace";

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; name: string } | null;
  isSystemDefault: boolean;
  projectId: string | null;
  stages: { id: string }[];
}

export const ProjectWorkflow = () => {
  const { projectId } = useOutletContext<ProjectContext>();
  const apiUrl = useApiUrl();
  const { mutate: duplicate } = useCustomMutation();
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();

  const { result } = useList<TemplateRow>({
    resource: "workflow-templates",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    pagination: { mode: "off" },
    sorters: [{ field: "createdAt", order: "asc" }],
    queryOptions: { enabled: Boolean(projectId) },
  });
  const rows = result?.data ?? [];

  const refresh = () =>
    invalidate({ resource: "workflow-templates", invalidates: ["list"] });

  const onDuplicate = (id: string) =>
    duplicate(
      {
        url: `${apiUrl}/workflow-templates/${id}/duplicate`,
        method: "post",
        // The copy belongs to this project.
        values: { projectId },
      },
      { onSuccess: refresh },
    );

  const onDelete = (id: string) =>
    remove({ resource: "workflow-templates", id }, { onSuccess: refresh });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Workflow templates</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} total
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="new">
                <Plus className="mr-1 h-4 w-4" />
                New template
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Scope</th>
              <th className="pb-2 font-medium text-right">Stages</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const owned = t.projectId === projectId;
              return (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2">
                    {owned ? (
                      <Link
                        to={t.id}
                        className="font-medium text-foreground hover:underline"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{t.name}</span>
                    )}
                  </td>
                  <td className="py-2">
                    <Badge variant="outline">{t.category?.name ?? "—"}</Badge>
                  </td>
                  <td className="py-2">
                    {owned ? (
                      <Badge variant="secondary">project</Badge>
                    ) : (
                      <Badge variant="outline">
                        {t.isSystemDefault ? "system default" : "global"}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {t.stages?.length ?? 0}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      {owned && (
                        <Button
                          asChild
                          size="icon"
                          variant="outline"
                          title="Open builder"
                        >
                          <Link to={t.id}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        title="Duplicate into this project"
                        onClick={() => onDuplicate(t.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {owned && (
                        <Button
                          size="icon"
                          variant="destructive"
                          title="Delete"
                          onClick={() => onDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Global/system templates are read-only here — duplicate one to build your
          own project template, or start a new one. Template stages are copied
          independently into a process when you create one on an order.
        </p>
      </CardContent>
    </Card>
  );
};
