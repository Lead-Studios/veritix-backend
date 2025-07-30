import { Injectable, Logger } from '@nestjs/common';
import { FraudRuleService } from './fraud-rule.service';
import {
  Order,
  FraudAlert,
  FraudContext,
  FraudSeverity,
  FraudReport,
} from './fraud-detection.types';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private alerts: FraudAlert[] = [];
  private orderHistory: Order[] = [];

  constructor(private fraudRuleService: FraudRuleService) {}

  async analyzeOrder(order: Order): Promise<FraudAlert[]> {
    this.logger.log(`Analyzing order ${order.id} for fraud patterns`);

    // Store order in history
    this.orderHistory.push(order);

    // Build context for fraud analysis
    const context = this.buildFraudContext(order);

    // Get active fraud rules
    const rules = this.fraudRuleService.getRules();

    const triggeredAlerts: FraudAlert[] = [];

    // Check each rule
    for (const rule of rules) {
      try {
        if (rule.check(order, context)) {
          const alert: FraudAlert = {
            id: this.generateAlertId(),
            orderId: order.id,
            ruleTriggered: rule.name,
            severity: rule.severity,
            description: rule.description,
            timestamp: new Date(),
            resolved: false,
          };

          triggeredAlerts.push(alert);
          this.alerts.push(alert);

          this.logger.warn(
            `Fraud alert triggered: ${rule.name} for order ${order.id} (Severity: ${rule.severity})`,
          );
        }
      } catch (error) {
        this.logger.error(`Error executing fraud rule ${rule.name}:`, error);
      }
    }

    // Auto-flag high severity orders
    if (
      triggeredAlerts.some((alert) => alert.severity === FraudSeverity.CRITICAL)
    ) {
      this.logger.error(
        `CRITICAL fraud alert for order ${order.id} - immediate review required`,
      );
    }

    return triggeredAlerts;
  }

  private buildFraudContext(currentOrder: Order): FraudContext {
    const ipHistory = new Map<string, Order[]>();
    const userHistory = new Map<string, Order[]>();
    const emailHistory = new Map<string, Order[]>();

    // Group orders by IP, user, and email
    for (const order of this.orderHistory) {
      // IP history
      if (!ipHistory.has(order.ipAddress)) {
        ipHistory.set(order.ipAddress, []);
      }
      ipHistory.get(order.ipAddress)!.push(order);

      // User history
      if (!userHistory.has(order.userId)) {
        userHistory.set(order.userId, []);
      }
      userHistory.get(order.userId)!.push(order);

      // Email history
      if (!emailHistory.has(order.email)) {
        emailHistory.set(order.email, []);
      }
      emailHistory.get(order.email)!.push(order);
    }

    return {
      recentOrders: this.orderHistory.slice(-100), // Last 100 orders
      ipHistory,
      userHistory,
      emailHistory,
    };
  }

  async getFraudReport(days: number = 30): Promise<FraudReport> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const recentAlerts = this.alerts.filter(
      (alert) => alert.timestamp >= fromDate,
    );

    const alertsBySeverity = {
      [FraudSeverity.LOW]: 0,
      [FraudSeverity.MEDIUM]: 0,
      [FraudSeverity.HIGH]: 0,
      [FraudSeverity.CRITICAL]: 0,
    };

    const alertsByRule: Record<string, number> = {};

    recentAlerts.forEach((alert) => {
      alertsBySeverity[alert.severity]++;
      alertsByRule[alert.ruleTriggered] =
        (alertsByRule[alert.ruleTriggered] || 0) + 1;
    });

    // Find suspicious IPs and users
    const suspiciousIPs = this.findSuspiciousIPs();
    const suspiciousUsers = this.findSuspiciousUsers();

    return {
      totalAlerts: recentAlerts.length,
      alertsBySeverity,
      alertsByRule,
      recentAlerts: recentAlerts.slice(0, 50), // Last 50 alerts
      suspiciousIPs,
      suspiciousUsers,
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
    };
  }

  private findSuspiciousIPs(): string[] {
    const ipCounts = new Map<string, number>();

    this.alerts.forEach((alert) => {
      const order = this.orderHistory.find((o) => o.id === alert.orderId);
      if (order) {
        ipCounts.set(order.ipAddress, (ipCounts.get(order.ipAddress) || 0) + 1);
      }
    });

    return Array.from(ipCounts.entries())
      .filter(([, count]) => count >= 3)
      .map(([ip]) => ip);
  }

  private findSuspiciousUsers(): string[] {
    const userCounts = new Map<string, number>();

    this.alerts.forEach((alert) => {
      const order = this.orderHistory.find((o) => o.id === alert.orderId);
      if (order) {
        userCounts.set(order.userId, (userCounts.get(order.userId) || 0) + 1);
      }
    });

    return Array.from(userCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([userId]) => userId);
  }

  async resolveAlert(alertId: string, adminNotes?: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.adminNotes = adminNotes;
      this.logger.log(`Fraud alert ${alertId} resolved by admin`);
    }
  }

  async getUnresolvedAlerts(): Promise<FraudAlert[]> {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  private generateAlertId(): string {
    return `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
