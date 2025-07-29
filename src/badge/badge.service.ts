import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { Attendee } from 'src/conference/entities/attendee.entity';

@Injectable()
export class BadgeService {
  async generateBadge(attendee: Attendee): Promise<Buffer> {
    const doc = new PDFDocument();
    const bufferChunks: Buffer[] = [];

    doc.on('data', chunk => bufferChunks.push(chunk));
    doc.on('end', () => console.log('PDF created'));

    // Attendee info
    doc.fontSize(20).text(attendee.fullName);
    doc.fontSize(16).text(attendee.company || '');
    doc.fontSize(14).text(`Ticket Type: ${attendee.ticketType}`);

    // QR Code content (base64 string)
    const qrData = await QRCode.toDataURL(
      JSON.stringify({ attendeeId: attendee.id, ticketType: attendee.ticketType })
    );

    doc.image(qrData, {
      fit: [150, 150],
      align: 'center'
    });

    // Styling (role-based)
    if (attendee.ticketType === 'SPEAKER') {
      doc.fillColor('red').fontSize(18).text('SPEAKER');
    }

    doc.end();

    return new Promise(resolve =>
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)))
    );
  }
}