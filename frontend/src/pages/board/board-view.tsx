import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useList, useNotification } from "@refinedev/core";
import { useNavigate } from "react-router";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { axiosInstance } from "@/providers/axios";

interface StageCard {
  id: string;
  name: string;
  sequence: number;
  status: string;
  projectId: string | null;
  projectName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  processName: string | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
}

const ALL = "__all__";
const COLUMNS: { key: string; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

interface Opt {
  id: string;
  code?: string;
  name?: string;
}

export const BoardView = () => {
  const navigate = useNavigate();
  const { open } = useNotification();
  const [cards, setCards] = useState<StageCard[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState(ALL);
  const [userId, setUserId] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const dragId = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (projectId !== ALL) params.projectId = projectId;
      if (userId !== ALL) params.userId = userId;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axiosInstance.get<{
        isAdmin: boolean;
        cards: StageCard[];
      }>("/stage-board", { params });
      setCards(res.data.cards ?? []);
      setIsAdmin(Boolean(res.data.isAdmin));
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Filter options (only fetched/used by admins).
  const { result: projects } = useList<Opt>({
    resource: "projects",
    pagination: { mode: "off" },
    queryOptions: { enabled: isAdmin },
  });
  const { result: users } = useList<Opt>({
    resource: "users",
    pagination: { mode: "off" },
    queryOptions: { enabled: isAdmin },
  });

  const byStatus = useMemo(() => {
    const map: Record<string, StageCard[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    for (const c of cards) (map[c.status] ??= []).push(c);
    return map;
  }, [cards]);

  const move = async (cardId: string, target: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === target) return;
    // Optimistic move; the backend enforces sequential gating.
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: target } : c)),
    );
    try {
      await axiosInstance.patch(`/process-stages/${cardId}/status`, {
        status: target,
      });
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not change the stage status.";
      open?.({ type: "error", message: String(msg) });
      await load(); // revert to server truth
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Stage Board</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "All assigned stages — drag a card to change its status."
              : "Stages assigned to you — drag a card to change its status."}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All projects</SelectItem>
                {(projects?.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} · ` : ""}
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All users</SelectItem>
                {(users?.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {(projectId !== ALL || userId !== ALL || from || to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProjectId(ALL);
                setUserId(ALL);
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragId.current ?? e.dataTransfer.getData("text/plain");
              dragId.current = null;
              if (id) void move(id, col.key);
            }}
            className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2"
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary">
                {byStatus[col.key]?.length ?? 0}
              </Badge>
            </div>
            {(byStatus[col.key] ?? []).map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  dragId.current = c.id;
                  e.dataTransfer.setData("text/plain", c.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (c.projectId && c.orderId)
                    navigate(`/projects/${c.projectId}/orders/${c.orderId}`);
                }}
                className="cursor-pointer rounded-md border bg-card p-3 shadow-sm active:opacity-70"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">
                    {c.sequence}. {c.name}
                  </span>
                  {c.processName && (
                    <Badge variant="outline">{c.processName}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.projectName ?? "—"}
                  {c.orderNumber ? ` · ${c.orderNumber}` : ""}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {c.estimatedStartDate && (
                    <span>
                      {c.estimatedStartDate}
                      {c.estimatedCompletedDate
                        ? ` → ${c.estimatedCompletedDate}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!loading && (byStatus[col.key]?.length ?? 0) === 0 && (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                No stages.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
