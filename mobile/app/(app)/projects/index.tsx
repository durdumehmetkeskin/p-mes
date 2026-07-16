import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { humanizeStatus } from "@/components/project/detail-config";

interface Project extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  managerUser?: { name?: string };
  customerCompany?: { name?: string };
}

export default function ProjectsListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Project>
      resource="projects"
      title="Projects"
      search
      createRoute="/projects/create"
      tabBar
      emptyTitle="No projects"
      renderItem={(p) => (
        <Pressable
          onPress={() => router.push(`/projects/${p.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {p.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {p.code}
              </Text>
            </View>
            {p.status ? (
              <Text className="text-xs text-muted-foreground">
                {humanizeStatus(p.status)}
              </Text>
            ) : null}
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            {[p.customerCompany?.name, p.managerUser?.name]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Pressable>
      )}
    />
  );
}
