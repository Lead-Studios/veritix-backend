export abstract class BaseDomainException extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(message);
  }
}
