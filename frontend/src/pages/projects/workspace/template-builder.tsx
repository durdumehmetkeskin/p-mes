import {
  useCreate,
  useInvalidate,
  useList,
  useOne,
  useUpdate,
} from "@refinedev/core";
import { Settings2 } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CanvasLink,
  CanvasStage,
} from "./workflow-canvas/template-canvas";

// The node canvas pulls in @xyflow/react + dagre — lazy so the main bundle
// doesn't grow (the app is otherwise a single chunk).
const TemplateCanvas = lazy(() => import("./workflow-canvas/template-canvas"));

interface StageTypeOpt {
  id: string;
  code: string;
  name: string;
  categoryId: string;
}
interface CategoryOpt {
  id: string;
  name: string;
}
interface TemplateStage {
  id: string;
  stageTypeId: string;
  sequence: number;
  name: string | null;
  input: string | null;
  output: string | null;
  posX: number | null;
  posY: number | null;
  incomingLinks?: Array<{ fromStageId: string; kind?: "sequence" | "io" }>;
  stageType: { code: string; name: string } | null;
}
interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  isSystemDefault: boolean;
  stages: TemplateStage[];
}

/**
 * Dify-style workflow template editor: a compact top bar (name, category,
 * description, save) over a full-height drag & drop node canvas. All stage
 * editing happens on the canvas.
 */
export const TemplateBuilder = () => {
  const { id, tplId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(tplId);

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const invalidate = useInvalidate();

  const { result: template } = useOne<TemplateRecord>({
    resource: "workflow-templates",
    id: tplId ?? "",
    queryOptions: { enabled: isEdit },
  });

  const projectFilter = [
    { field: "projectId", operator: "eq" as const, value: id },
  ];
  const { result: library } = useList<StageTypeOpt>({
    resource: "stage-types",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const stageTypes = library?.data ?? [];

  const { result: catResult } = useList<CategoryOpt>({
    resource: "stage-type-categories",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const categories = catResult?.data ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stages, setStages] = useState<CanvasStage[]>([]);
  const [links, setLinks] = useState<CanvasLink[]>([]);
  const [saving, setSaving] = useState(false);
  const keyRef = useRef(0);
  const nextKey = () => `s${(keyRef.current += 1)}`;
  const initialized = useRef(false);

  // Load an existing template (nodes + dependency links) into the editor once.
  useEffect(() => {
    if (isEdit && template && !initialized.current) {
      initialized.current = true;
      setName(template.name);
      setDescription(template.description ?? "");
      setCategoryId(template.categoryId);
      const ordered = [...(template.stages ?? [])].sort(
        (a, b) => a.sequence - b.sequence,
      );
      const keyByStageId = new Map<string, string>();
      const loaded = ordered.map((s) => {
        const key = nextKey();
        keyByStageId.set(s.id, key);
        return {
          key,
          stageTypeId: s.stageTypeId,
          // All stages share the template category (enforced).
          categoryId: template.categoryId,
          code: s.stageType?.code ?? "?",
          name: s.name ?? "",
          input: s.input ?? "",
          output: s.output ?? "",
          posX: s.posX,
          posY: s.posY,
        };
      });
      setStages(loaded);
      setLinks(
        ordered.flatMap((s) =>
          (s.incomingLinks ?? []).flatMap((l) => {
            const fromKey = keyByStageId.get(l.fromStageId);
            const toKey = keyByStageId.get(s.id);
            return fromKey && toKey
              ? [{ fromKey, toKey, kind: l.kind ?? ("sequence" as const) }]
              : [];
          }),
        ),
      );
    }
  }, [isEdit, template]);

  // Only stage types of the chosen category can be added.
  const filteredTypes = stageTypes.filter((s) => s.categoryId === categoryId);

  const onCategoryChange = (value: string) => {
    setCategoryId(value);
    // Drop stages that no longer match the category (and their links).
    setStages((prev) => {
      const kept = prev.filter((s) => s.categoryId === value);
      const keptKeys = new Set(kept.map((s) => s.key));
      setLinks((prevLinks) =>
        prevLinks.filter(
          (l) => keptKeys.has(l.fromKey) && keptKeys.has(l.toKey),
        ),
      );
      return kept;
    });
  };

  const addStage = (stageTypeId: string, pos: { x: number; y: number }) => {
    const st = stageTypes.find((s) => s.id === stageTypeId);
    if (!st) return;
    setStages((prev) => [
      ...prev,
      {
        key: nextKey(),
        stageTypeId: st.id,
        categoryId: st.categoryId,
        code: st.code,
        name: st.name,
        input: "",
        output: "",
        posX: pos.x,
        posY: pos.y,
      },
    ]);
  };

  const patchStage = (key: string, patch: Partial<CanvasStage>) =>
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );

  const removeStage = (key: string) => {
    setStages((prev) => prev.filter((s) => s.key !== key));
    setLinks((prev) =>
      prev.filter((l) => l.fromKey !== key && l.toKey !== key),
    );
  };

  const addLink = (link: CanvasLink) => setLinks((prev) => [...prev, link]);

  const removeLink = (link: CanvasLink) =>
    setLinks((prev) =>
      prev.filter(
        (l) =>
          !(
            l.fromKey === link.fromKey &&
            l.toKey === link.toKey &&
            l.kind === link.kind
          ),
      ),
    );

  const save = () => {
    if (!name.trim() || !categoryId) return;
    setSaving(true);
    const indexOf = new Map(stages.map((s, i) => [s.key, i]));
    const values = {
      name: name.trim(),
      description: description || undefined,
      categoryId,
      stages: stages.map((s) => ({
        stageTypeId: s.stageTypeId,
        name: s.name || undefined,
        input: s.input || undefined,
        output: s.output || undefined,
        posX: s.posX ?? undefined,
        posY: s.posY ?? undefined,
      })),
      // Arrows as indices into the stages array (kind: sequence | io).
      links: links.map((l) => ({
        from: indexOf.get(l.fromKey)!,
        to: indexOf.get(l.toKey)!,
        kind: l.kind,
      })),
    };
    const opts = {
      onSuccess: () => {
        invalidate({ resource: "workflow-templates", invalidates: ["list"] });
        setSaving(false);
        navigate(`/projects/${id}/workflow`);
      },
      onError: () => setSaving(false),
    };
    if (isEdit && tplId) {
      update({ resource: "workflow-templates", id: tplId, values }, opts);
    } else {
      // New templates are scoped to the current project.
      create(
        { resource: "workflow-templates", values: { ...values, projectId: id } },
        opts,
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-9.5rem)] min-h-[560px] flex-col gap-3">
      {/* Top bar — template meta lives here; the canvas gets the rest. */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card/50 px-3 py-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/projects/${id}/workflow`}>← Workflow</Link>
        </Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isEdit ? "Template name" : "New template name…"}
          className="h-8 w-64 border-none bg-transparent text-base font-semibold shadow-none focus-visible:ring-1"
        />
        {template?.isSystemDefault && (
          <Badge variant="secondary">system default</Badge>
        )}
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-8 w-52">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" title="Template settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Textarea
                id="tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </PopoverContent>
        </Popover>
        <span className="ml-auto text-xs text-muted-foreground">
          {stages.length} stages · {links.length} connections
        </span>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !name.trim() || !categoryId}
        >
          {saving ? "Saving..." : "Save template"}
        </Button>
      </div>

      {/* Full-height Dify-style canvas (palette | canvas | config panel). */}
      <div className="min-h-0 flex-1">
        {categoryId ? (
          <Suspense
            fallback={<div className="h-full animate-pulse rounded-md border" />}
          >
            <TemplateCanvas
              stages={stages}
              links={links}
              typeOptions={filteredTypes}
              onAddStage={addStage}
              onPatchStage={patchStage}
              onRemoveStage={removeStage}
              onAddLink={addLink}
              onRemoveLink={removeLink}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border text-sm text-muted-foreground">
            Select a category to start building — its stage types will appear
            in the library.
          </div>
        )}
      </div>
    </div>
  );
};
