import { useState } from "react";
import { Text, View } from "react-native";
import { type BaseRecord, useGetIdentity, useOne } from "@refinedev/core";
import { useLocalSearchParams } from "expo-router";

import { useIsAdmin } from "@/hooks/use-is-admin";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { Screen } from "@/components/refine-ui/screen";
import { SegmentedTabs, type TabDef } from "@/components/refine-ui/segmented-tabs";
import {
  ContactsTab,
  CustomerTab,
  FilesTab,
  InventoryTab,
  OrdersTab,
  OverviewTab,
  PlaceholderTab,
  TeamTab,
  WorkflowTab,
} from "@/components/project/tabs";
import { TimelineTab } from "@/components/project/timeline-tab";

const TABS: TabDef[] = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "inventory", label: "Materials & Tools" },
  { key: "customer", label: "Customer" },
  { key: "contacts", label: "Contacts" },
  { key: "team", label: "Team" },
  { key: "workflow", label: "Workflow" },
  { key: "timeline", label: "Timeline" },
  { key: "files", label: "Files" },
];

export default function ProjectWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as string;
  const { result, query } = useOne<BaseRecord>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: !!projectId, retry: 1 },
  });
  // Refine v5 useOne returns `result` as the record itself (not `{ data }`).
  const project = result;
  const customerCompanyId = (project?.customerCompanyId as string) ?? null;

  // Editing a project is reserved to admins and its manager (backend 403s
  // everyone else) — hide the pencil for other users.
  const isAdmin = useIsAdmin();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const canEdit =
    isAdmin ||
    (!!identity?.id && identity.id === (project?.managerUserId as string));

  const [tab, setTab] = useState("overview");

  // Customer, Contacts & Workflow tabs are visible ONLY to admins and the
  // manager (backend serves them manager-only too).
  const managerOnlyTabs = new Set(["customer", "contacts", "workflow"]);
  const tabs = TABS.filter((t) => !managerOnlyTabs.has(t.key) || canEdit);

  return (
    <Screen
      title={project?.name ?? "Project"}
      subtitle={project?.code}
      canGoBack
      headerRight={
        <DetailActions
          resource="projects"
          id={projectId}
          name={project?.name ?? "this project"}
          editRoute={`/projects/${projectId}/edit`}
          editAllowed={canEdit}
        />
      }
    >
      {/* Gate the tabs on the project actually loading, so a slow/failed fetch
          shows a spinner or an error instead of silently-empty tab content. */}
      {!project && query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !project ? (
        <View className="items-center gap-3 p-8">
          <Text className="text-center text-sm text-muted-foreground">
            {query.isError
              ? "Could not load this project."
              : "Project not found."}
          </Text>
          <Button label="Retry" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <>
          <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} />
          <View className="flex-1">
            {tab === "overview" && <OverviewTab project={project} />}
            {tab === "orders" && <OrdersTab projectId={projectId} />}
            {tab === "inventory" && <InventoryTab projectId={projectId} />}
            {tab === "customer" && canEdit && (
              <CustomerTab
                projectId={projectId}
                customerCompanyId={customerCompanyId}
              />
            )}
            {tab === "contacts" && canEdit && (
              <ContactsTab
                projectId={projectId}
                customerCompanyId={customerCompanyId}
              />
            )}
            {tab === "team" && <TeamTab projectId={projectId} />}
            {tab === "workflow" && canEdit && (
              <WorkflowTab projectId={projectId} />
            )}
            {tab === "timeline" && <TimelineTab projectId={projectId} />}
            {tab === "files" && <FilesTab projectId={projectId} />}
          </View>
        </>
      )}
    </Screen>
  );
}
