export declare class BcryptProvider {
    hashPassword(password: string | Buffer): Promise<string>;
    comparePassword(data: string | Buffer, encrypted: string): Promise<boolean>;
}
