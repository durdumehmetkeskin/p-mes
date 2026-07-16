import type { BaseRecord } from "@refinedev/core";

/** Composite option/label builders mirroring the web relational-select labels. */
const join = (parts: (string | undefined | null)[], sep: string) =>
  parts.filter(Boolean).join(sep);

export const labelMaterial = (m: BaseRecord) => join([m.code, m.name], " · ");
export const labelWarehouse = (w: BaseRecord) => join([w.code, w.name], " · ");
export const labelZone = (z: BaseRecord) =>
  join([z.warehouse?.code, z.code], " / ");
export const labelRack = (r: BaseRecord) =>
  join([r.zone?.warehouse?.code ?? r.warehouse?.code, r.zone?.code, r.code], " / ");
export const labelLot = (l: BaseRecord) =>
  join([l.material?.code, l.lotNumber], " / ");
