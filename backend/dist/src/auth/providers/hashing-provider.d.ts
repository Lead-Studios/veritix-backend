export declare abstract class HashingProvider {
    abstract hashPassword(password: string | Buffer): Promise<string>;
    abstract comparePassword(data: string | Buffer, encrypted: string): Promise<boolean>;
}
