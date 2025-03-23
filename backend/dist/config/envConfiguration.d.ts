declare const _default: () => {
    port: number;
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        name: string;
    };
    jwt: {
        secret: string;
        expirationTime: string;
    };
    logging: {
        level: string;
        detailed: boolean;
    };
};
export default _default;
