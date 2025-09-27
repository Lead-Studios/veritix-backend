import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface ValidationResult {
  valid: boolean;
  expired: boolean;
  ticketId?: string;
  reason?: string;
}

@Injectable()
export class TicketQrService {
  private readonly prefix = 'vtx';

  constructor(private readonly config: ConfigService) {}

  private getExpirySeconds(): number {
    return this.config.get<number>('qr.expirySeconds') ?? 30;
  }

  private getSecret(): string {
    return this.config.get<string>('qr.secret') ?? 'change-me';
  }

  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.getSecret()).update(payload).digest('hex');
  }

  private buildCodeString(ticketId: string, ts: number): string {
    const payload = `${ticketId}:${ts}`;
    const signature = this.sign(payload);
    return `${this.prefix}:${ticketId}:${ts}:${signature}`;
  }

  async generateQrSvg(ticketId: string): Promise<string> {
    const ts = Math.floor(Date.now() / 1000);
    const code = this.buildCodeString(ticketId, ts);
    return QRCode.toString(code, { type: 'svg' });
  }

  validateCode(code: string): ValidationResult {
    try {
      const parts = code.split(':');
      if (parts.length !== 4) {
        return { valid: false, expired: false, reason: 'Invalid format' };
      }
      const [prefix, ticketId, tsStr, sig] = parts;
      if (prefix !== this.prefix) {
        return { valid: false, expired: false, reason: 'Invalid prefix' };
      }
      const ts = Number(tsStr);
      if (!Number.isFinite(ts)) {
        return { valid: false, expired: false, reason: 'Invalid timestamp' };
      }
      const expectedSig = this.sign(`${ticketId}:${ts}`);
      if (sig !== expectedSig) {
        return { valid: false, expired: false, reason: 'Signature mismatch' };
      }
      const now = Math.floor(Date.now() / 1000);
      const age = now - ts;
      const expiry = this.getExpirySeconds();
      if (age > expiry) {
        return { valid: false, expired: true, ticketId, reason: 'Code expired' };
      }
      return { valid: true, expired: false, ticketId };
    } catch (e) {
      return { valid: false, expired: false, reason: 'Validation error' };
    }
  }
}