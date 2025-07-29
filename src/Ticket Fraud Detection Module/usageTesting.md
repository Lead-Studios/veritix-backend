/ Example usage and testing
/\*
// Example order to test the system
const testOrder: Order = {
id: 'order_123',
userId: 'user_456',
email: 'test@tempmail.com',
ipAddress: '192.168.1.100',
amount: 6000, // High value
items: [
{ productId: 'prod_1', quantity: 15, price: 400 }, // Mass purchase
],
timestamp: new Date(),
billingAddress: {
street: '123 Main St',
city: 'New York',
state: 'NY',
zipCode: '10001',
country: 'US',
},
shippingAddress: {
street: '456 Oak St',
city: 'London',
state: 'England',
zipCode: 'SW1A 1AA',
country: 'UK', // Different country - will trigger rule
},
paymentMethod: 'credit_card',
};

// API calls:
// POST /fraud-detection/analyze - Analyze an order for fraud
// GET /fraud-detection/alerts/unresolved - Get unresolved alerts (admin only)
// PATCH /fraud-detection/alerts/:alertId/resolve - Resolve an alert (admin only)
// GET /fraud-detection/report?days=30 - Get fraud report (admin only)
// GET /fraud-detection/rules - Get fraud rules (admin only)
// PATCH /fraud-detection/rules/:ruleName - Update a rule (admin only)
\*/
