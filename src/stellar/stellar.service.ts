import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from 'stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from '../orders/entities/orders.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.Server;
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private receivingAddress: string | null;
  private readonly emailTemplate: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {
    const templatePath = path.join(
      __dirname,
      '../common/email/templates/ticket-confirmation.html',
    );
    this.emailTemplate = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf8')
      : '';
  }

  onModuleInit() {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.receivingAddress =
      this.configService.get<string>('STELLAR_RECEIVING_ADDRESS') ?? null;

    if (this.receivingAddress) {
      if (!StellarSdk.StrKey.isValidEd25519PublicKey(this.receivingAddress)) {
        throw new Error(`Invalid STELLAR_RECEIVING_ADDRESS: ${this.receivingAddress}`);
      }
    }

    const horizonUrl =
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

    this.server = new StellarSdk.Horizon.Server(horizonUrl);
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getReceivingAddress(): string | null {
    return this.receivingAddress;
  }

  generateMemo(orderId: string): string {
    return orderId.substring(0, 8);
  }

  getServer(): StellarSdk.Horizon.Server {
    return this.server;
  }

  async processConfirmedPayment(
    txHash: string,
    from: string,
    memo: string,
    amount: string,
  ): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { stellarMemo: memo },
      relations: ['tickets'],
    });

    if (!order) {
      this.logger.warn(`processConfirmedPayment: unknown memo ${memo}, skipping`);
      return;
    }

    if (order.stellarTxHash) {
      this.logger.warn(`processConfirmedPayment: duplicate txHash ${txHash}, skipping`);
      return;
    }

    const paid = Number(amount);
    const required = Number(order.totalAmountXLM);
    if (paid < required) {
      this.logger.warn(
        `processConfirmedPayment: underpayment for order ${order.id} — got ${paid}, need ${required}`,
      );
      return;
    }

    order.status = OrderStatus.PAID;
    order.stellarTxHash = txHash;
    order.paidAt = new Date();
    await this.orderRepo.save(order);

    this.logger.log(`Order ${order.id} confirmed via tx ${txHash}`);

    setImmediate(() => this.sendTicketEmails(order.id));
  }

  private async sendTicketEmails(orderId: string): Promise<void> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['tickets', 'tickets.event', 'tickets.ticketType'],
      });

      if (!order?.tickets?.length) return;

      const user = await this.userRepo.findOne({ where: { id: order.userId } });
      if (!user?.email) return;

      for (const ticket of order.tickets) {
        const html = this.emailTemplate
          .replace('{{attendeeName}}', user.fullName || 'Attendee')
          .replace('{{eventTitle}}', ticket.event?.title || '')
          .replace(
            '{{eventDate}}',
            ticket.event?.eventDate
              ? new Date(ticket.event.eventDate).toLocaleString()
              : '',
          )
          .replace('{{ticketType}}', ticket.ticketType?.name || '')
          .replace('{{qrCodeImage}}', `data:image/png;base64,${ticket.id}`);

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Your ticket for ${ticket.event?.title || 'the event'}`,
          html,
        });
      }
    } catch (err) {
      this.logger.error(`sendTicketEmails failed for order ${orderId}`, err);
    }
  }
}
