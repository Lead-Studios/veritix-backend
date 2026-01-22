export type UserId = string;

export interface WalletLink {
  chain: string; // e.g. "ethereum"
  address: string;
}

export class User {
  constructor(
    public readonly id: UserId,
    public email: string | null,
    public capabilities: string[],
    public ownedEventIds: string[],
    public ownedTicketIds: string[],
    public wallet?: WalletLink,
    public createdAt: Date = new Date(),
  ) {}

  can(capability: string): boolean {
    return this.capabilities.includes(capability);
  }
}
