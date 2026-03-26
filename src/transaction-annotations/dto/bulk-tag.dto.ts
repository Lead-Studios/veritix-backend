export class BulkTagDto {
    tag: string;
    filter: {
      minAmount?: number;
      maxAmount?: number;
      dateFrom?: string;
      dateTo?: string;
    };
  }