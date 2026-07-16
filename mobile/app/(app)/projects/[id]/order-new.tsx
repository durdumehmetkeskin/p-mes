import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { OrderFormFields } from "@/components/order/order-form-fields";
import { ResourceForm } from "@/components/refine-ui/resource-form";

export default function OrderCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();

  return (
    <ResourceForm
      resource="orders"
      action="create"
      title="New order"
      redirect={false}
      defaultValues={{ projectId: id }}
      onSuccess={() => {
        invalidate({ resource: "orders", invalidates: ["list"] });
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => <OrderFormFields control={control} />}
    </ResourceForm>
  );
}
