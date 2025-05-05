import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../attendee/entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import * as QRCode from 'qrcode';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
    private configService: ConfigService,
  ) {}

  async generateBadge(ticketId: string): Promise<string> {
    
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['attendee', 'conference', 'registeredSessions'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'badges');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    
    const qrCodeData = JSON.stringify({
      attendeeId: ticket.attendee.id,
      ticketId: ticket.id,
      conferenceId: ticket.conference.id,
    });
    
    const qrCodePath = path.join(uploadsDir, `${ticketId}-qr.png`);
    await QRCode.toFile(qrCodePath, qrCodeData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
    });

    
    const pdfPath = path.join(uploadsDir, `${ticketId}-badge.pdf`);
    await this.createBadgePdf(ticket, qrCodePath, pdfPath);

    
    const baseUrl = this.configService.get('BASE_URL', 'http:
    const badgeUrl = `${baseUrl}/badge/download/${ticketId}`;
    
    ticket.badgeGenerated = true;
    ticket.badgeUrl = badgeUrl;
    await this.ticketRepository.save(ticket);

    return badgeUrl;
  }

  private async createBadgePdf(ticket: Ticket, qrCodePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      
      const doc = new PDFDocument({
        size: [378, 576], 
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      
      if (ticket.conference.logoUrl) {
        try {
          doc.image(ticket.conference.logoUrl, {
            fit: [338, 100],
            align: 'center',
          });
        } catch (error) {
          
          console.error('Error loading conference logo:', error);
        }
      }

      
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(16).fillColor(ticket.conference.primaryColor || '#000000');
      doc.text(ticket.conference.name, { align: 'center' });
      
      
      doc.moveDown();
      doc.fontSize(24).fillColor('#000000');
      doc.text(ticket.attendee.fullName, { align: 'center' });
      
      if (ticket.attendee.company) {
        doc.moveDown(0.5);
        doc.fontSize(16).fillColor('#555555');
        doc.text(ticket.attendee.company, { align: 'center' });
      }

      
      if (ticket.attendee.role) {
        doc.moveDown();
        
        
        let bgColor = '#EEEEEE'; 
        switch (ticket.attendee.role.toUpperCase()) {
          case 'SPEAKER':
            bgColor = '#FFD700'; 
            break;
          case 'VIP':
            bgColor = '#FF5733'; 
            break;
          case 'STAFF':
            bgColor = '#4CAF50'; 
            break;
        }
        
        
        const roleWidth = 200;
        const roleHeight = 30;
        const roleX = (doc.page.width - roleWidth) / 2;
        const roleY = doc.y;
        
        doc.roundedRect(roleX, roleY, roleWidth, roleHeight, 5)
           .fillAndStroke(bgColor, '#000000');
        
        doc.fillColor('#000000').fontSize(14);
        doc.text(ticket.attendee.role.toUpperCase(), 
                roleX, roleY + 8, 
                { width: roleWidth, align: 'center' });
        
        doc.y = roleY + roleHeight + 10;
      }

      
      doc.moveDown();
      doc.fontSize(14).fillColor('#555555');
      doc.text(`Ticket: ${ticket.type}`, { align: 'center' });

      
      doc.moveDown();
      try {
        doc.image(qrCodePath, {
          fit: [200, 200],
          align: 'center',
        });
      } catch (error) {
        console.error('Error adding QR code to PDF:', error);
        reject(error);
        return;
      }

      
      doc.moveDown();
      doc.fontSize(10).fillColor('#777777');
      doc.text('Scan this code for event check-in and session tracking', { align: 'center' });

      
      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  async getBadgeFilePath(ticketId: string): Promise<string> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    
    if (!ticket || !ticket.badgeGenerated) {
      throw new NotFoundException('Badge not found or not yet generated');
    }
    
    const badgePath = path.join(process.cwd(), 'uploads', 'badges', `${ticketId}-badge.pdf`);
    
    if (!fs.existsSync(badgePath)) {
      throw new NotFoundException('Badge file not found');
    }
    
    return badgePath;
  }
}