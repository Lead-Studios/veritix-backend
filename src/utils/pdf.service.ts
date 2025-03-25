import { Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import * as fs from "fs";
import { join } from "path";

@Injectable()
export class PdfService {
  public async generateTicketReceipt(ticket: any): Promise<string> {
    const fileName = `receipt-${ticket.id}.pdf`;
    const filePath = join(__dirname, "../../receipts", fileName);

    // Ensure receipts folder exists
    if (!fs.existsSync(join(__dirname, "../../receipts"))) {
      fs.mkdirSync(join(__dirname, "../../receipts"));
    }

    const doc = new PDFDocument();

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(24).text("🎟️ Ticket Receipt", { align: "center" });
    doc.moveDown();

    // Ticket Details
    doc.fontSize(16).text(`Event: ${ticket.event.name}`);
    doc.text(`Ticket Name: ${ticket.name}`);
    doc.text(`Price: $${ticket.price.toFixed(2)}`);
    doc.text(`Transaction ID: ${ticket.transactionId}`);
    doc.text(`Purchase Date: ${ticket.createdAt.toISOString().split("T")[0]}`);
    doc.moveDown();

    // Footer
    doc
      .fontSize(12)
      .text("Thank you for Booking our ticket! 🎉", { align: "center" });

    doc.end();

    // Wait for file to finish writing
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(filePath));
      writeStream.on("error", (err) => reject(err));
    });
  }
}
