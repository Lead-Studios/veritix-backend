declare class EnvironmentVariables {
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    JWT_SECRET: string;
    JWT_EXPIRATION: string;
    CONTRACT_ADDRESS: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export {};
