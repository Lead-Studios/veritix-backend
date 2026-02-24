import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Order } from '../orders/orders.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { TicketService } from '../tickets-inventory/services/ticket.service';
import { TicketTypeService } from '../tickets-inventory/services/ticket-type.service';
import { StellarCursor } from './entities/stellar-cursor.entity';
import { StellarConfig, defaultStellarConfig } from './stellar.config';

/**
 * StellarService
 * Handles communication with the Stellar blockchain, including listening for payments
 * and making outbound refund payments.
 */
@Injectable()
export class StellarService implements OnModuleDestroy {
  private readonly logger = new Logger(StellarService.name);
  private readonly config: StellarConfig;
  public server: StellarSdk.Horizon.Server; // Public for testing purposes
  private streamCloseFunction: (() => void) | null = null;
  private retryCount = 0;
  private isShuttingDown = false;
  private processedTxHashes = new Set<string>();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(StellarCursor)
    private readonly cursorRepo: Repository<StellarCursor>,
    private readonly ticketService: TicketService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // Load configuration
    this.config = {
      ...defaultStellarConfig,
      platformAddress:
        this.configService.get<string>('STELLAR_PLATFORM_ADDRESS') ||
        defaultStellarConfig.platformAddress,
      horizonUrl:
        this.configService.get<string>('blockchain.horizonUrl') ||
        defaultStellarConfig.horizonUrl,
    };

    if (!this.config.platformAddress) {
      this.logger.warn(
        'STELLAR_PLATFORM_ADDRESS not configured. Payment listener will not start.',
      );
    }

    this.server = new StellarSdk.Horizon.Server(this.config.horizonUrl);
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.streamCloseFunction) {
      this.logger.log('Closing Stellar payment stream...');
      this.streamCloseFunction();
      this.streamCloseFunction = null;
    }
  }

  /**
   * Send a refund payment in XLM to the destination address
   * @param destinationAddress Originating wallet address
   * @param amountXLM Amount in XLM to refund
   * @param orderId Internal order reference mapping the refund
   * @returns The transaction hash of the successful payment
   */
  async sendRefund(
    destinationAddress: string,
    amountXLM: number,
    orderId: string,
  ): Promise<string> {
    const secretKey = this.configService.get<string>('stellarSecretKey');
    if (!secretKey) {
      throw new Error('STELLAR_SECRET_KEY is not configured on the platform');
    }

    const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    let retries = 0;
    const maxRetries = 1;

    while (true) {
      try {
        // Load account to get sequence number
        const account = await this.server.loadAccount(sourcePublicKey);

        let fee: string = StellarSdk.BASE_FEE;
        try {
          // Use minimum base fee if available
          const feeStats = await this.server.feeStats();
          fee = feeStats.last_ledgers_base_fee_stats.min.toString();
        } catch (e) {
          this.logger.warn(
            'Could not fetch fee stats, defaulting to standard BASE_FEE',
          );
        }

        const transaction = new StellarSdk.TransactionBuilder(account, {
          fee,
          networkPassphrase: this.config.networkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: destinationAddress,
              asset: StellarSdk.Asset.native(),
              amount: amountXLM.toString(),
            }),
          )
          .addMemo(StellarSdk.Memo.text(`Ref-${orderId}`.substring(0, 28))) // Max 28 bytes
          .setTimeout(30)
          .build();

        transaction.sign(sourceKeypair);

        const response = await this.server.submitTransaction(transaction);
        this.logger.log(`Refund transaction successful: ${response.hash}`);
        return response.hash;
      } catch (error: any) {
        if (error?.response?.status === 429 && retries < maxRetries) {
          this.logger.warn(
            'RATE_LIMIT_EXCEEDED from Horizon. Retrying in 2 seconds...',
          );
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        this.logger.error(
          `Failed to submit stellar refund: ${error?.message || error}`,
        );
        throw error;
      }
    }
  }

  /**
   * Start listening for payments to the platform address.
   * Opens a Stellar Horizon SSE stream and processes incoming payments.
   */
  async listenForPayments(): Promise<void> {
    if (!this.config.platformAddress) {
      this.logger.error(
        'Cannot start payment listener: STELLAR_PLATFORM_ADDRESS not configured',
      );
      return;
    }

    this.logger.log(
      `Starting Stellar payment listener for address: ${this.config.platformAddress}`,
    );

    try {
      // Load the last cursor from database
      const cursor = await this.loadCursor();
      this.logger.log(
        cursor
          ? `Resuming from cursor: ${cursor}`
          : 'Starting from latest payments',
      );

      // Build payment stream
      let paymentsCall = this.server
        .payments()
        .forAccount(this.config.platformAddress)
        .order('asc');

      if (cursor) {
        paymentsCall = paymentsCall.cursor(cursor);
      }

      // Start streaming
      this.streamCloseFunction = paymentsCall.stream({
        onmessage: async (payment: any) => {
          await this.handlePayment(payment);
        },
        onerror: async (error: any) => {
          await this.handleStreamError(error);
        },
      });

      this.logger.log('Stellar payment listener started successfully');
      this.retryCount = 0; // Reset retry count on successful connection
    } catch (error) {
      this.logger.error('Failed to start payment listener', error);
      await this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming payment from Stellar stream.
   */
  private async handlePayment(payment: any): Promise<void> {
    try {
      // Only process payment operations
      if (payment.type !== 'payment') {
        await this.saveCursor(payment.paging_token);
        return;
      }

      // Only process XLM payments to our platform address
      if (
        payment.asset_type !== 'native' ||
        payment.to !== this.config.platformAddress
      ) {
        await this.saveCursor(payment.paging_token);
        return;
      }

      const txHash = payment.transaction_hash;
      const amount = parseFloat(payment.amount);
      const memo = await this.extractMemo(txHash);

      this.logger.log(
        `Received payment: ${amount} XLM, memo: ${memo || 'none'
        }, tx: ${txHash}`,
      );

      // Check for duplicate transaction (idempotency)
      if (this.processedTxHashes.has(txHash)) {
        this.logger.warn(`Duplicate transaction detected: ${txHash}, skipping`);
        await this.saveCursor(payment.paging_token);
        return;
      }

      // Check if transaction already processed in database
      const existingOrder = await this.orderRepo.findOne({
        where: { stellarTxHash: txHash },
      });

      if (existingOrder) {
        this.logger.warn(
          `Transaction ${txHash} already processed for order ${existingOrder.id}, skipping`,
        );
        this.processedTxHashes.add(txHash);
        await this.saveCursor(payment.paging_token);
        return;
      }

      // Unknown memo - log and ignore
      if (!memo) {
        this.logger.warn(
          `Payment received without memo or with invalid memo: ${txHash}`,
        );
        await this.saveCursor(payment.paging_token);
        return;
      }

      // Find order by memo
      const order = await this.orderRepo.findOne({
        where: { stellarMemo: memo },
        relations: ['items', 'items.ticketType'],
      });

      if (!order) {
        this.logger.warn(`No order found for memo: ${memo}, tx: ${txHash}`);
        await this.saveCursor(payment.paging_token);
        return;
      }

      // Process the payment
      await this.processPayment(order, amount, txHash);

      // Mark as processed
      this.processedTxHashes.add(txHash);

      // Save cursor after successful processing
      await this.saveCursor(payment.paging_token);
    } catch (error) {
      this.logger.error('Error handling payment', error);
      // Don't save cursor on error - will retry this payment on reconnect
    }
  }

  /**
   * Extract memo from transaction.
   */
  private async extractMemo(txHash: string): Promise<string | null> {
    try {
      const transaction = await this.server
        .transactions()
        .transaction(txHash)
        .call();

      if (!transaction.memo || transaction.memo_type === 'none') {
        return null;
      }

      // Handle different memo types
      if (transaction.memo_type === 'text') {
        return transaction.memo;
      }

      // For other memo types, convert to string
      return transaction.memo?.toString() || null;
    } catch (error) {
      this.logger.error(`Failed to fetch transaction ${txHash}`, error);
      return null;
    }
  }

  /**
   * Process a payment for an order.
   */
  private async processPayment(
    order: Order,
    amount: number,
    txHash: string,
  ): Promise<void> {
    this.logger.log(
      `Processing payment for order ${order.id}: ${amount} XLM (required: ${order.totalAmountXLM})`,
    );

    // Verify order is still PENDING
    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(
        `Order ${order.id} is not PENDING (status: ${order.status}), skipping`,
      );
      return;
    }

    // Verify order has not expired
    if (order.isExpired()) {
      this.logger.warn(`Order ${order.id} has expired, marking as FAILED`);
      await this.orderRepo.update(order.id, {
        status: OrderStatus.FAILED,
        stellarTxHash: txHash,
        metadata: {
          failureReason: 'Order expired before payment was received',
          paymentAmount: amount,
        } as any,
      });
      return;
    }

    // Verify payment amount is sufficient
    const requiredAmount = parseFloat(order.totalAmountXLM.toString());
    if (amount < requiredAmount) {
      this.logger.warn(
        `Underpayment for order ${order.id}: received ${amount} XLM, required ${requiredAmount} XLM`,
      );
      await this.orderRepo.update(order.id, {
        status: OrderStatus.FAILED,
        stellarTxHash: txHash,
        metadata: {
          failureReason: 'Insufficient payment amount',
          paymentAmount: amount,
          requiredAmount: requiredAmount,
        } as any,
      });
      return;
    }

    // Process payment in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Update order status
      await manager.update(Order, order.id, {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        stellarTxHash: txHash,
      });

      // Create tickets for each order item
      for (const item of order.items) {
        this.logger.log(
          `Creating ${item.quantity} tickets for ticketType ${item.ticketTypeId}`,
        );

        // Create tickets
        await this.ticketService.createTickets(
          order.eventId,
          {
            ticketTypeId: item.ticketTypeId,
            attendeeEmail: '', // Will be filled from user data or order metadata
            attendeeName: '',
          },
          item.quantity,
        );
      }

      this.logger.log(`Order ${order.id} marked as PAID, tickets issued`);
    });

    // Send confirmation email (outside transaction to avoid blocking)
    try {
      await this.sendConfirmationEmail(order);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email for order ${order.id}`,
        error,
      );
      // Don't fail the payment processing if email fails
    }
  }

  /**
   * Send confirmation email to buyer.
   */
  private async sendConfirmationEmail(order: Order): Promise<void> {
    // TODO: Get user email from userId
    // For now, log that email would be sent
    this.logger.log(
      `Sending confirmation email for order ${order.id} to user ${order.userId}`,
    );
  }

  /**
   * Handle stream errors and implement reconnection logic.
   */
  private async handleStreamError(error: any): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.log('Stream error during shutdown, not reconnecting');
      return;
    }

    this.logger.error('Stellar payment stream error', error);
    await this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff.
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    if (this.retryCount >= this.config.maxRetries) {
      this.logger.error(
        `Max retry attempts (${this.config.maxRetries}) reached. Payment listener stopped.`,
      );
      return;
    }

    this.retryCount++;
    const backoffMs =
      this.config.initialBackoffMs * Math.pow(2, this.retryCount - 1);

    this.logger.log(
      `Reconnecting in ${backoffMs}ms (attempt ${this.retryCount}/${this.config.maxRetries})`,
    );

    setTimeout(() => {
      this.listenForPayments();
    }, backoffMs);
  }

  /**
   * Load the last cursor from database.
   */
  private async loadCursor(): Promise<string | null> {
    try {
      const record = await this.cursorRepo.findOne({
        where: { key: this.config.cursorStorageKey },
      });
      return record?.cursor || null;
    } catch (error) {
      this.logger.error('Failed to load cursor from database', error);
      return null;
    }
  }

  /**
   * Save cursor to database.
   */
  private async saveCursor(cursor: string): Promise<void> {
    try {
      await this.cursorRepo.upsert(
        {
          key: this.config.cursorStorageKey,
          cursor,
        },
        ['key'],
      );
    } catch (error) {
      this.logger.error('Failed to save cursor to database', error);
    }
  }

  /**
   * Get order by stellar memo (for testing/debugging).
   */
  async getOrderByMemo(memo: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { stellarMemo: memo },
      relations: ['items', 'items.ticketType'],
    });
  }
}
