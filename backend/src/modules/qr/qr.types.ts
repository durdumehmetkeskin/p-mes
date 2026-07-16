/** The kind of entity a QR code points at. */
export type QrEntityType =
  | 'tool'
  | 'material'
  | 'order-item'
  | 'stock-item'
  | 'product';

/**
 * Structured payload encoded (as JSON) inside a generated QR code. Scanning the
 * code yields this object — `url` deep-links into the SPA while `type`/`id`/`code`
 * let a custom scanner resolve the entity directly.
 */
export interface QrPayload {
  type: QrEntityType;
  id: string;
  code: string;
  url: string;
}

/** A rendered QR image plus the file name to suggest on download. */
export interface QrResult {
  fileName: string;
  buffer: Buffer;
}
