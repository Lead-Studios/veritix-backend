import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);

  /**
   * Generate a QR code as a base64 PNG data URI.
   * Encodes only the raw ticket UUID — not a URL — to keep it
   * portable across scanner apps.
   *
   * @param ticketCode  The raw UUID stored in Ticket.qrCode
   * @returns           A data URI: "data:image/png;base64,..."
   */
  async generateQRDataURI(ticketCode: string): Promise<string> {
    return QRCode.toDataURL(ticketCode, {
      type: 'image/png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });
  }

  /**
   * Generate a QR code as a raw PNG Buffer.
   * Useful for embedding directly in email attachments (CID inline images).
   *
   * @param ticketCode  The raw UUID stored in Ticket.qrCode
   * @returns           Raw PNG bytes as a Buffer
   */
  async generateQRBuffer(ticketCode: string): Promise<Buffer> {
    return QRCode.toBuffer(ticketCode, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });

    
  }


  async generateQRDataURI(ticketCode: string): Promise<string> {
    try {
      return await QRCode.toDataURL(ticketCode, {
        type: 'image/png',
        width: 300,
        margin: 2,
      });
    } catch (error) {
      this.logger.error(
        `QR generation failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // ✅ Buffer (for email attachment / embedding)
  async generateQRBuffer(ticketCode: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(ticketCode, {
        type: 'png',
        width: 300,
        margin: 2,
      });
    } catch (error) {
      this.logger.error(
        `QR buffer generation failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  const withQR = await Promise.all(
    saved.map(async (ticket) => {
      try {
        // ✅ IMPORTANT: encode ONLY raw UUID
        ticket.qrCodeImage = await this.qrService.generateQRDataURI(
          ticket.qrCode,
        );
      } catch (err) {
        this.logger.error(
          `QR generation failed for ticket ${ticket.id}: ${
            (err as Error).message
          }`,
        );
  
        // ❗ Do NOT block issuance
        ticket.qrCodeImage = null;
      }
  
      return ticket;
    }),
  );
  
  const finalSaved = await this.ticketRepository.save(withQR);
}
