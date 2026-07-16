import { Pressable } from "react-native";
import { useDelete } from "@refinedev/core";
import { Pencil, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Can } from "@/components/can";
import { confirmDelete } from "@/components/refine-ui/confirm";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

/** Standard edit + delete header actions for a detail screen. */
export function DetailActions({
  resource,
  id,
  name,
  editRoute,
  onDeleted,
}: {
  resource: string;
  id: string;
  name: string;
  editRoute?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { mutate: remove } = useDelete();

  return (
    <>
      {editRoute ? (
        <Can resource={resource} action="edit">
          <Pressable
            onPress={() => router.push(editRoute)}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={Pencil} color={colors.foreground} />
          </Pressable>
        </Can>
      ) : null}
      <Can resource={resource} action="delete">
        <Pressable
          onPress={() =>
            confirmDelete(name, () =>
              remove(
                { resource, id },
                { onSuccess: () => (onDeleted ? onDeleted() : router.back()) },
              ),
            )
          }
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
        >
          <Icon icon={Trash2} color={colors.destructive} />
        </Pressable>
      </Can>
    </>
  );
}
