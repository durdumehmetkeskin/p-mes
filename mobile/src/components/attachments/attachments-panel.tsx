import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Download, Eye, FileText, Paperclip, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Can } from "@/components/can";
import { confirmDelete } from "@/components/refine-ui/confirm";
import { ActionMenu } from "@/components/ui/action-menu";
import { Icon } from "@/components/ui/icon";
import { downloadAndShare } from "@/lib/download";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface Attachment {
  id: string;
  fileName?: string;
  contentType?: string;
  size?: number;
}

type OwnerType = "project" | "process" | "stage";

export function AttachmentsPanel({
  ownerType,
  ownerId,
}: {
  ownerType: OwnerType;
  ownerId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<Attachment[]>("/attachments", {
        params: { ownerType, ownerId },
      });
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: { uri: string; name: string; type: string }) => {
    setBusy(true);
    try {
      const form = new FormData();
      // RN FormData file part
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
      await axiosInstance.post(`/attachments/${ownerType}/${ownerId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded");
      await load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    await upload({
      uri: a.uri,
      name: a.name ?? "file",
      type: a.mimeType ?? "application/octet-stream",
    });
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Photo permission denied");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const name = a.fileName ?? a.uri.split("/").pop() ?? "photo.jpg";
    await upload({ uri: a.uri, name, type: a.mimeType ?? "image/jpeg" });
  };

  const download = (att: Attachment) =>
    downloadAndShare({
      url: `/attachments/${att.id}/download`,
      fallbackName: att.fileName ?? "file",
    }).catch(() => toast.error("Download failed"));

  const remove = (att: Attachment) =>
    confirmDelete(att.fileName ?? "file", async () => {
      try {
        await axiosInstance.delete(`/attachments/${att.id}`);
        await load();
      } catch {
        toast.error("Delete failed");
      }
    });

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          Attachments ({items.length})
        </Text>
        <Can resource="attachments" action="create">
          <ActionMenu
            title={busy ? "Uploading…" : "Add attachment"}
            options={[
              { label: "Document", icon: FileText, onPress: pickDocument },
              { label: "Photo", icon: Paperclip, onPress: pickImage },
            ]}
            trigger={(open) => (
              <Pressable
                onPress={open}
                hitSlop={8}
                disabled={busy}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={Paperclip} size={18} color={colors.foreground} />
              </Pressable>
            )}
          />
        </Can>
      </View>

      {items.length === 0 ? (
        <Text className="p-3 text-sm text-muted-foreground">No attachments</Text>
      ) : (
        items.map((att, i) => (
          <View
            key={att.id}
            className={i > 0 ? "flex-row items-center gap-2 border-t border-border p-3" : "flex-row items-center gap-2 p-3"}
          >
            <Icon icon={FileText} size={16} color={colors.mutedForeground} />
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {att.fileName}
            </Text>
            <Pressable
              onPress={() =>
                router.push(
                  `/viewer?url=${encodeURIComponent(`/attachments/${att.id}/download`)}&name=${encodeURIComponent(att.fileName ?? "file")}`,
                )
              }
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
            >
              <Icon icon={Eye} size={16} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={() => download(att)} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
              <Icon icon={Download} size={16} color={colors.foreground} />
            </Pressable>
            <Can resource="attachments" action="delete">
              <Pressable onPress={() => remove(att)} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
                <Icon icon={Trash2} size={16} color={colors.destructive} />
              </Pressable>
            </Can>
          </View>
        ))
      )}
    </View>
  );
}
