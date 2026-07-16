import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { axiosInstance } from "@/providers/axios";

interface ReportData {
  id: string;
  summary: string;
  outcome: string | null;
  reportedByUser: { name?: string } | null;
  updatedAt: string;
}

/**
 * Completion report form for a completed stage or process. `endpoint` is the
 * resource's `/completion-report` path (GET returns the report or null, PUT
 * upserts). Rendered only once the entity is completed (the backend also
 * enforces that).
 */
export function CompletionReportCard({
  endpoint,
  editable,
  title = "Completion report",
}: {
  endpoint: string;
  editable: boolean;
  title?: string;
}) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get<ReportData | null>(endpoint);
      const data =
        res.data && typeof res.data === "object" ? res.data : null;
      setReport(data);
      setSummary(data?.summary ?? "");
      setOutcome(data?.outcome ?? "");
    } catch {
      /* leave empty */
    } finally {
      setLoaded(true);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      await axiosInstance.put(endpoint, {
        summary: summary.trim(),
        outcome: outcome.trim() || undefined,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {report && (
          <span className="text-xs text-muted-foreground">
            {report.reportedByUser?.name
              ? `${report.reportedByUser.name} · `
              : ""}
            {new Date(report.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Summary</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={!editable}
          placeholder="What was completed…"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Outcome</Label>
        <Input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={!editable}
          placeholder="e.g. OK / rework"
        />
      </div>
      {editable ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={busy || !summary.trim()}
            onClick={() => void save()}
          >
            {report ? "Update report" : "Save report"}
          </Button>
        </div>
      ) : (
        loaded &&
        !report && (
          <p className="text-xs text-muted-foreground">
            No completion report filed.
          </p>
        )
      )}
    </div>
  );
}
