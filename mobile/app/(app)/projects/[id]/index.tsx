import { useState } from "react";
import { Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { Screen } from "@/components/refine-ui/screen";
import { SegmentedTabs, type TabDef } from "@/components/refine-ui/segmented-tabs";
import {
  CategoriesTab,
  ContactsTab,
  CustomerTab,
  FilesTab,
  InventoryTab,
  OrdersTab,
  OverviewTab,
  PlaceholderTab,
  StageTypesTab,
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
  { key: "categories", label: "Categories" },
  { key: "stage-types", label: "Stage Types" },
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

  const [tab, setTab] = useState("overview");

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
          <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />
          <View className="flex-1">
            {tab === "overview" && <OverviewTab project={project} />}
            {tab === "orders" && <OrdersTab projectId={projectId} />}
            {tab === "inventory" && <InventoryTab projectId={projectId} />}
            {tab === "customer" && (
              <CustomerTab customerCompanyId={customerCompanyId} />
            )}
            {tab === "contacts" && (
              <ContactsTab
                projectId={projectId}
                customerCompanyId={customerCompanyId}
              />
            )}
            {tab === "team" && <TeamTab projectId={projectId} />}
            {tab === "categories" && <CategoriesTab projectId={projectId} />}
            {tab === "stage-types" && <StageTypesTab projectId={projectId} />}
            {tab === "workflow" && <WorkflowTab projectId={projectId} />}
            {tab === "timeline" && <TimelineTab projectId={projectId} />}
            {tab === "files" && <FilesTab projectId={projectId} />}
          </View>
        </>
      )}
    </Screen>
  );
}
