import { RevenueShareType } from '../revenue-sharing.entity';

export class CreateRevenueSplitDto {
  splits: { 
    stakeholderId: string; 
    shareType: RevenueShareType; 
    shareValue: number 
  }[];
}