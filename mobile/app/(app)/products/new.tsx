import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { type FieldValues, useForm } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import {
  NumberField,
  RelationSelectField,
  ResourceSelectField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { axiosInstance } from "@/providers/axios";

/**
 * Record a produced product (intermediate/finished/mold — RN port of the web
 * StageProductDialog). Opened automatically right after a stage is completed
 * (`prompted=1` → skippable). Posts to /products; with `stageId` the backend
 * derives the process/order origin from the stage.
 */
export default function ProductNewScreen() {
  const { stageId, prompted } = useLocalSearchParams<{
    stageId?: string;
    prompted?: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const { has } = usePermissions();
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit } = useForm<FieldValues>({
    defaultValues: { quantity: 1 },
  });

  const close = () => {
    if (router.canGoBack()) router.back();
  };

  const save = handleSubmit(async (v) => {
    setSaving(true);
    try {
      await axiosInstance.post("/products", {
        name: v.name,
        productTypeId: v.productTypeId || undefined,
        quantity: typeof v.quantity === "number" ? v.quantity : 1,
        materialUnitId: v.materialUnitId || undefined,
        storageRackId: v.storageRackId || undefined,
        note: v.note || undefined,
        stageId: stageId || undefined,
      });
      invalidate({ resource: "products", invalidates: ["list"] });
      toast.success("Product recorded");
      close();
    } catch (err) {
      const msg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Could not save product"),
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Screen title="Record product" canGoBack>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {prompted === "1" ? (
          <Text className="text-xs text-muted-foreground">
            Bu aşamada üretileni kaydedin — isteğe bağlı, daha sonra da
            ekleyebilirsiniz.
          </Text>
        ) : null}
        <TextField
          control={control}
          name="name"
          label="Name"
          rules={{ required: "Name is required" }}
        />
        <ResourceSelectField
          control={control}
          name="productTypeId"
          label="Product type"
          resource="product-types"
          placeholder="Select a type"
          allowClear
        />
        <NumberField control={control} name="quantity" label="Quantity" />
        {has("material-units:read") ? (
          <ResourceSelectField
            control={control}
            name="materialUnitId"
            label="Unit"
            resource="material-units"
            placeholder="Select unit"
            allowClear
          />
        ) : null}
        <RelationSelectField
          control={control}
          name="storageRackId"
          label="Konulacak raf (lokasyon deposu)"
          resource="storage-racks"
          getLabel={(r) =>
            [
              (r as { storage?: { location?: { name?: string } | null } | null })
                .storage?.location?.name,
              (r as { code?: string }).code,
            ]
              .filter(Boolean)
              .join(" · ") || String(r.id)
          }
          placeholder="Raf seçin (isteğe bağlı)"
          allowClear
        />
        <TextAreaField control={control} name="note" label="Note" />
        <Button
          label={saving ? "Saving…" : "Save product"}
          loading={saving}
          onPress={save}
        />
        {prompted === "1" ? (
          <Button variant="outline" label="Skip" onPress={close} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
