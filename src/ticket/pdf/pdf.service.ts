import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  async generateReceiptPdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(20).text('Ticket Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Ticket: ${data.ticket}`);
    doc.text(`Event: ${data.event}`);
    doc.text(`Amount: $${data.amount}`);
    doc.text(`Purchase Date: ${new Date(data.purchaseDate).toLocaleString()}`);
    doc.text(`Transaction ID: ${data.transactionId}`);
    doc.text(`User: ${data.user}`);
    doc.moveDown();
    doc.text('Thank you for your purchase!', { align: 'center' });

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }
} 