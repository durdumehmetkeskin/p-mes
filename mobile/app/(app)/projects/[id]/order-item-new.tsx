import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { OrderItemFormFields } from "@/components/order/order-item-form-fields";
import { ResourceForm } from "@/components/refine-ui/resource-form";

export default function OrderItemNewScreen() {
  const { orderId, sequence, editId } = useLocalSearchParams<{
    orderId?: string;
    sequence?: string;
    editId?: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  return (
    <ResourceForm
      resource="order-items"
      action={isEdit ? "edit" : "create"}
      id={editId}
      title={isEdit ? "Edit item" : "New item"}
      redirect={false}
      defaultValues={
        isEdit
          ? undefined
          : { orderId, sequence: sequence ? Number(sequence) : 1 }
      }
      onSuccess={() => {
        invalidate({ resource: "order-items", invalidates: ["list"] });
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => <OrderItemFormFields control={control} />}
    </ResourceForm>
  );
}
