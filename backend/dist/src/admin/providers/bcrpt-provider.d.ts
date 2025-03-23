import { HashingProvider } from './hashing-services';
export declare class BcryptProvider implements HashingProvider {
    hashPassword(password: string | Buffer): Promise<string>;
    comparePassword(data: string | Buffer, encrypted: string): Promise<boolean>;
}
