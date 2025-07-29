import { Injectable } from '@nestjs/common';
import {
  FraudRule,
  FraudSeverity,
  Order,
  FraudContext,
} from './fraud-detection.types';

@Injectable()
export class FraudRuleService {
  private rules: FraudRule[] = [
    {
      name: 'MASS_PURCHASE',
      description: 'Order contains unusually high quantity of items',
      severity: FraudSeverity.MEDIUM,
      enabled: true,
      check: (order: Order) => {
        const totalQuantity = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        return totalQuantity > 10; // Flag orders with more than 10 items
      },
    },
    {
      name: 'HIGH_VALUE_ORDER',
      description: 'Order amount exceeds normal threshold',
      severity: FraudSeverity.HIGH,
      enabled: true,
      check: (order: Order) => {
        return order.amount > 5000; // Flag orders over $5000
      },
    },
    {
      name: 'DUPLICATE_IP_MULTIPLE_USERS',
      description: 'Same IP address used by multiple users',
      severity: FraudSeverity.MEDIUM,
      enabled: true,
      check: (order: Order, context: FraudContext) => {
        const ipOrders = context.ipHistory.get(order.ipAddress) || [];
        const uniqueUserIds = new Set(ipOrders.map((o) => o.userId));
        return uniqueUserIds.size > 3; // Flag if more than 3 users from same IP
      },
    },
    {
      name: 'RAPID_ORDERS',
      description: 'Multiple orders from same user in short time',
      severity: FraudSeverity.HIGH,
      enabled: true,
      check: (order: Order, context: FraudContext) => {
        const userOrders = context.userHistory.get(order.userId) || [];
        const recentOrders = userOrders.filter(
          (o) =>
            new Date(order.timestamp).getTime() -
              new Date(o.timestamp).getTime() <
            300000, // 5 minutes
        );
        return recentOrders.length > 2; // Flag if more than 2 orders in 5 minutes
      },
    },
    {
      name: 'MISMATCHED_ADDRESSES',
      description: 'Billing and shipping addresses are in different countries',
      severity: FraudSeverity.MEDIUM,
      enabled: true,
      check: (order: Order) => {
        return order.billingAddress.country !== order.shippingAddress.country;
      },
    },
    {
      name: 'SUSPICIOUS_EMAIL_PATTERN',
      description: 'Email follows suspicious patterns',
      severity: FraudSeverity.LOW,
      enabled: true,
      check: (order: Order) => {
        const email = order.email.toLowerCase();
        // Check for patterns like disposable emails or suspicious domains
        const suspiciousPatterns = [
          /\d{8,}@/, // Long sequences of numbers
          /@tempmail/, // Temporary email services
          /@guerrillamail/,
          /@10minutemail/,
        ];
        return suspiciousPatterns.some((pattern) => pattern.test(email));
      },
    },
    {
      name: 'VELOCITY_CHECK',
      description: 'Unusual velocity of orders from IP',
      severity: FraudSeverity.HIGH,
      enabled: true,
      check: (order: Order, context: FraudContext) => {
        const ipOrders = context.ipHistory.get(order.ipAddress) || [];
        const last24Hours = ipOrders.filter(
          (o) =>
            new Date(order.timestamp).getTime() -
              new Date(o.timestamp).getTime() <
            86400000, // 24 hours
        );
        return last24Hours.length > 5; // Flag if more than 5 orders from IP in 24 hours
      },
    },
  ];

  getRules(): FraudRule[] {
    return this.rules.filter((rule) => rule.enabled);
  }

  updateRule(ruleName: string, updates: Partial<FraudRule>): void {
    const ruleIndex = this.rules.findIndex((rule) => rule.name === ruleName);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  addCustomRule(rule: FraudRule): void {
    this.rules.push(rule);
  }
}
