export class ReceiptDto {
  receiptId: string;
  user: {
    fullName: string;
    email: string;
  };
  event: {
    name: string;
    date: string;
    location: string;
  };
  ticket: {
    quantity: number;
    pricePerTicket: number;
    totalPrice: number;
  };
  totalAmountPaid: number;
  transactionDate: string;
} 