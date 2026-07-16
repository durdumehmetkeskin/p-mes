import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { QrEntityType, QrPayload } from './qr.types';

/**
 * Generates QR codes for business entities (tools, materials, orders). Each code
 * encodes a structured JSON payload (see {@link QrPayload}) as a PNG image, so it
 * is produced on demand and never persisted. Shared by the tooling, inventory
 * and project modules via {@link QrModule}.
 */
@Injectable()
export class QrService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Build the structured payload to encode. `path` is an SPA route (e.g.
   * `/tools/:id`) that is prefixed with the configured public app URL.
   */
  buildPayload(
    type: QrEntityType,
    id: string,
    code: string,
    path: string,
  ): QrPayload {
    const base = this.config
      .get<string>('app.appUrl', 'http://localhost:5173')
      .replace(/\/+$/, '');
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    return { type, id, code, url };
  }

  /** Render the payload (serialized as JSON) to a PNG image buffer. */
  toPng(payload: QrPayload): Promise<Buffer> {
    return QRCode.toBuffer(JSON.stringify(payload), {
      type: 'png',
      errorCorrectionLevel: 'M',
      width: 512,
      margin: 2,
    });
  }

  /**
   * Suggested download file name, e.g. `tool-TOOL-001-qr.png`. The business code
   * is sanitized so it is always a safe file name.
   */
  fileName(prefix: QrEntityType, code: string): string {
    const safe = code.replace(/[^a-zA-Z0-9._-]+/g, '_');
    return `${prefix}-${safe}-qr.png`;
  }
}
