import { useDelete, useList, useOne } from "@refinedev/core";
import { Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { OrderItems } from "../../orders/order-items";
import { ConfirmDelete } from "./confirm-delete";
import { OrderRequiredMaterials } from "./order-required-materials";

interface OrderRecord {
  id: string;
  orderNumber: string;
  name: string | null;
  description: string | null;
  dueDate: string | null;
  status: string | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const ProjectOrderDetail = () => {
  const { id, orderId } = useParams();
  const navigate = useNavigate();
  const { result } = useOne<OrderRecord>({
    resource: "orders",
    id: orderId ?? "",
    queryOptions: { enabled: Boolean(orderId) },
  });
  const order = result;

  // Deleting an order is reserved to admins and the project's manager
  // (backend mirrors with a 403).
  const { result: project } = useOne<{ managerUserId: string | null }>({
    resource: "projects",
    id: id ?? "",
    queryOptions: { enabled: Boolean(id) },
  });
  const canEditProject = useCanEditProject();
  const canManageOrders = canEditProject(project?.managerUserId);

  // Leaf-first: an order can only be deleted once it has no processes.
  const { result: processList } = useList({
    resource: "processes",
    filters: [{ field: "orderId", operator: "eq", value: orderId ?? "" }],
    pagination: { pageSize: 1, currentPage: 1 },
    queryOptions: { enabled: Boolean(orderId) },
  });
  const hasProcesses = (processList?.total ?? 0) > 0;

  const { mutate: removeOrder } = useDelete();
  const onDeleteOrder = () =>
    removeOrder(
      { resource: "orders", id: orderId ?? "" },
      { onSuccess: () => navigate(`/projects/${id}/orders`) },
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/projects/${id}/orders`}>← Orders</Link>
        </Button>
        {order && (
          <h2 className="text-lg font-semibold">
            {order.orderNumber}
            {order.name ? ` · ${order.name}` : ""}
          </h2>
        )}
        {order && (
          <div className="ml-auto flex items-center gap-2">
            {!hasProcesses && canManageOrders && (
              <ConfirmDelete
                title="Delete order?"
                description="This order and its line items will be removed. Reserved materials will return to available stock."
                onConfirm={onDeleteOrder}
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label="Delete order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {!order ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Order number">{order.orderNumber}</Field>
              <Field label="Due date">{order.dueDate ?? "—"}</Field>
              <Field label="Status">
                {order.status ? (
                  <StatusBadge label={String(order.status).replace(/_/g, " ")} />
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Description">{order.description ?? "—"}</Field>
            </>
          )}
        </CardContent>
      </Card>

      {order && (
        <OrderItems
          orderId={order.id}
          projectId={id ?? ""}
          orderNumber={order.orderNumber}
        />
      )}

      {order && (
        <OrderRequiredMaterials orderId={order.id} canManage={canManageOrders} />
      )}
    </div>
  );
};
