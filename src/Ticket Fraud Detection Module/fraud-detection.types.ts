export interface Order {
  id: string;
  userId: string;
  email: string;
  ipAddress: string;
  amount: number;
  items: OrderItem[];
  timestamp: Date;
  billingAddress: Address;
  shippingAddress: Address;
  paymentMethod: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface FraudAlert {
  id: string;
  orderId: string;
  ruleTriggered: string;
  severity: FraudSeverity;
  description: string;
  timestamp: Date;
  resolved: boolean;
  adminNotes?: string;
}

export enum FraudSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface FraudRule {
  name: string;
  description: string;
  severity: FraudSeverity;
  enabled: boolean;
  check: (order: Order, context: FraudContext) => boolean;
}

export interface FraudContext {
  recentOrders: Order[];
  ipHistory: Map<string, Order[]>;
  userHistory: Map<string, Order[]>;
  emailHistory: Map<string, Order[]>;
}

export interface FraudReport {
  totalAlerts: number;
  alertsBySeverity: Record<FraudSeverity, number>;
  alertsByRule: Record<string, number>;
  recentAlerts: FraudAlert[];
  suspiciousIPs: string[];
  suspiciousUsers: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
}
