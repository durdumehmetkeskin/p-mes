import { axiosInstance } from "@/providers/axios";

/** Minimal router surface used here (avoids depending on expo-router's Router type). */
type NavRouter = { replace: (href: string) => void };

export interface QrPayload {
  type?: string;
  id?: string;
  code?: string;
  url?: string;
}

/** Parse a scanned QR string (JSON QrPayload). */
export function parseQr(raw: string): QrPayload | null {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && p.type && p.id) return p as QrPayload;
  } catch {
    // not our payload
  }
  return null;
}

/**
 * Route to the entity a scanned QR points at. Ignores the embedded web `url`
 * (it targets the web SPA) and navigates by {type,id}. Order items resolve
 * their order + projectId via GET /order-items/:id; legacy "order" codes
 * (no longer generated) still resolve via GET /orders/:id.
 */
export async function routeToQrEntity(
  payload: QrPayload,
  router: NavRouter,
): Promise<boolean> {
  const { type, id } = payload;
  if (!type || !id) return false;

  if (type === "material") {
    router.replace(`/materials/${id}`);
    return true;
  }
  if (type === "tool") {
    // Handover: the screen decides deliver/receive/return from the reservation.
    router.replace(`/tools/${id}/handover`);
    return true;
  }
  if (type === "stock-item") {
    // Handover: the screen decides deliver vs receive from the item's status.
    router.replace(`/stock-items/${id}/handover`);
    return true;
  }
  if (type === "product") {
    // Handover: producer delivers, warehouse receives (by handover status).
    router.replace(`/products/${id}/handover`);
    return true;
  }
  if (type === "order-item") {
    try {
      const { data } = await axiosInstance.get<{
        orderId?: string;
        order?: { projectId?: string };
      }>(`/order-items/${id}`);
      if (data?.orderId && data.order?.projectId) {
        router.replace(
          `/projects/${data.order.projectId}/orders/${data.orderId}`,
        );
        return true;
      }
    } catch {
      // fall through
    }
    return false;
  }
  if (type === "order") {
    try {
      const { data } = await axiosInstance.get<{ projectId?: string }>(
        `/orders/${id}`,
      );
      if (data?.projectId) {
        router.replace(`/projects/${data.projectId}/orders/${id}`);
        return true;
      }
    } catch {
      // fall through
    }
    return false;
  }
  return false;
}
