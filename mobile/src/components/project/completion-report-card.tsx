import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/providers/axios";

interface ReportData {
  id: string;
  summary: string;
  outcome: string | null;
  reportedByUser?: { name?: string } | null;
  updatedAt: string;
}

/**
 * Completion report form for a completed stage or process. `endpoint` is the
 * `/completion-report` path (GET → report | null, PUT → upsert). Only shown once
 * the entity is completed (the backend also enforces that).
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

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get<ReportData | null>(endpoint);
      const data = res.data && typeof res.data === "object" ? res.data : null;
      setReport(data);
      setSummary(data?.summary ?? "");
      setOutcome(data?.outcome ?? "");
    } catch {
      /* leave empty */
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
      toast.success("Report saved");
    } catch {
      toast.error("Could not save report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          {title}
        </Text>
        {report ? (
          <Text className="text-xs text-muted-foreground">
            {report.reportedByUser?.name ? `${report.reportedByUser.name} · ` : ""}
            {new Date(report.updatedAt).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
      <View className="gap-1.5">
        <Label>Summary</Label>
        <Input
          value={summary}
          onChangeText={setSummary}
          editable={editable}
          multiline
          numberOfLines={4}
          placeholder="What was completed…"
          style={{ textAlignVertical: "top", minHeight: 88 }}
        />
      </View>
      <View className="gap-1.5">
        <Label>Outcome</Label>
        <Input
          value={outcome}
          onChangeText={setOutcome}
          editable={editable}
          placeholder="e.g. OK / rework"
          autoCapitalize="none"
        />
      </View>
      {editable ? (
        <Button
          label={report ? "Update report" : "Save report"}
          loading={busy}
          disabled={!summary.trim()}
          onPress={() => void save()}
        />
      ) : !report ? (
        <Text className="text-xs text-muted-foreground">
          No completion report filed.
        </Text>
      ) : null}
    </View>
  );
}
