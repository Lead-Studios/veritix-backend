import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Horizon, TransactionBuilder, Keypair, Operation, Networks, Asset } from '@stellar/stellar-sdk';
import { TicketPurchase, OrderStatus } from '../tickets/entities/ticket-pruchase';
import { User } from '../users/entities/user.entity';
import { StellarCursor } from './entities/stellar-cursor.entity';
import { TicketService } from '../tickets/tickets.service';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: Horizon.Server;
  private readonly receivingAddress: string;
  private readonly secretKey: string;
  private readonly network: string;
  private balanceCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    @InjectRepository(TicketPurchase)
    private readonly orderRepository: Repository<TicketPurchase>,
    @InjectRepository(StellarCursor)
    private readonly cursorRepository: Repository<StellarCursor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly ticketService: TicketService,
  ) {
    const horizonUrl = this.configService.get<string>('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org';
    this.server = new Horizon.Server(horizonUrl);
    this.receivingAddress = this.configService.get<string>('STELLAR_RECEIVING_ADDRESS') || '';
    this.secretKey = this.configService.get<string>('STELLAR_SECRET_KEY') || '';
    this.network = this.configService.get<string>('STELLAR_NETWORK') || 'testnet';

    if (!this.receivingAddress || !this.secretKey) {
      this.logger.warn('Stellar configuration missing. Payment listener will not function properly.');
    }
  }

  async getPaymentInstructions(orderId: string, userId: string): Promise<{
    destinationAddress: string;
    memo: string;
    amountXLM: number;
    network: string;
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user.id.toString() !== userId) {
      throw new BadRequestException('You do not own this order');
    }

    if (!order.stellarMemo || !order.totalAmountXLM) {
      throw new BadRequestException('Order is not configured for Stellar payment');
    }

    return {
      destinationAddress: this.receivingAddress,
      memo: order.stellarMemo,
      amountXLM: order.totalAmountXLM,
      network: this.network,
    };
  }

  async startPaymentListener(): Promise<void> {
    this.logger.log('Starting Stellar payment listener...');

    let retryCount = 0;
    const maxRetries = 5;

    const listen = async () => {
      try {
        const cursor = await this.getOrCreateCursor();
        this.logger.log(`Starting payment stream from cursor: ${cursor.cursor}`);

        this.server
          .payments()
          .forAccount(this.receivingAddress)
          .cursor(cursor.cursor)
          .stream({
            onmessage: async (payment) => {
              await this.processPayment(payment);
            },
            onerror: (error) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`Payment stream error: ${errorMessage}`);
              this.handleStreamError(error, retryCount, maxRetries, listen);
            },
          });
      } catch (error) {
        this.logger.error(`Failed to start payment listener: ${error.message}`);
        this.handleStreamError(error, retryCount, maxRetries, listen);
      }
    };

    listen();
  }

  private async getOrCreateCursor(): Promise<StellarCursor> {
    let cursor = await this.cursorRepository.findOne({ where: {} });
    if (!cursor) {
      cursor = this.cursorRepository.create({ cursor: 'now' });
      await this.cursorRepository.save(cursor);
    }
    return cursor;
  }

  private async processPayment(payment: any): Promise<void> {
    try {
      if (payment.type !== 'payment' || payment.asset_type !== 'native') {
        return;
      }

      const memo = payment.memo;
      if (!memo) {
        this.logger.warn(`Payment without memo: ${payment.id}`);
        return;
      }

      const order = await this.orderRepository.findOne({
        where: { stellarMemo: memo },
        relations: ['user', 'ticket', 'event'],
      });

      if (!order) {
        this.logger.warn(`No order found for memo: ${memo}`);
        return;
      }

      if (order.status !== OrderStatus.PENDING) {
        this.logger.warn(`Order ${order.id} is not pending (status: ${order.status})`);
        return;
      }

      const receivedAmount = parseFloat(payment.amount);
      const expectedAmount = Number(order.totalAmountXLM);

      if (receivedAmount < expectedAmount) {
        this.logger.warn(`Underpayment for order ${order.id}: received ${receivedAmount}, expected ${expectedAmount}`);
        order.status = OrderStatus.FAILED;
        await this.orderRepository.save(order);
        return;
      }

      order.status = OrderStatus.PAID;
      order.stellarTxHash = payment.transaction_hash;
      await this.orderRepository.save(order);

      const ticket = await this.ticketService.createTicket({
        name: order.ticket.name,
        eventId: order.event.id,
        quantity: order.ticketQuantity,
        price: order.ticket.price,
        description: order.ticket.description,
        deadlineDate: order.ticket.deadlineDate,
        isReserved: false,
      });
      
      const updatedTicket = await this.ticketService.getTicketById(ticket.id);
      updatedTicket.userId = order.user.id.toString();
      await this.ticketService.updateTicket(ticket.id, updatedTicket);

      this.logger.log(`Order ${order.id} confirmed with payment ${payment.id}`);
    } catch (error) {
      this.logger.error(`Error processing payment: ${error.message}`);
    }
  }

  private handleStreamError(error: any, retryCount: number, maxRetries: number, listen: () => void): void {
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      this.logger.log(`Retrying payment listener in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => {
        retryCount++;
        listen();
      }, delay);
    } else {
      this.logger.error('Max retries reached. Payment listener stopped.');
    }
  }

  async sendRefund(destinationAddress: string, amountXLM: number, orderId: string): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(this.secretKey);
      const sourcePublicKey = sourceKeypair.publicKey();

      const account = await this.server.loadAccount(sourcePublicKey);
      const transaction = new TransactionBuilder(account, {
        fee: String(await this.server.fetchBaseFee()),
        networkPassphrase: this.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: destinationAddress,
            asset: Asset.native(),
            amount: amountXLM.toFixed(7),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);

      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (order) {
        order.refundTxHash = result.hash;
        await this.orderRepository.save(order);
      }

      this.logger.log(`Refund sent to ${destinationAddress}: ${result.hash}`);
      return result.hash;
    } catch (error) {
      if (error.response?.data?.extras?.result_codes?.transaction === 'tx_too_late') {
        this.logger.error('Transaction rate limit exceeded, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendRefund(destinationAddress, amountXLM, orderId);
      }
      this.logger.error(`Refund failed: ${error.message}`);
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async getAccountBalance(): Promise<any> {
    const now = Date.now();
    if (this.balanceCache && now - this.balanceCache.timestamp < this.CACHE_TTL) {
      return this.balanceCache.data;
    }

    try {
      const account = await this.server.loadAccount(this.receivingAddress);
      const balances = account.balances.map((balance: any) => ({
        asset_type: balance.asset_type,
        asset_code: balance.asset_code || 'XLM',
        balance: balance.balance,
      }));

      const result = {
        funded: true,
        balances,
        sequence: account.sequence,
      };

      this.balanceCache = { data: result, timestamp: now };
      return result;
    } catch (error) {
      if (error.response?.status === 404) {
        return { funded: false };
      }
      throw error;
    }
  }
}
