declare const _default: (() => {
    secret: string;
    audience: string;
    issuer: string;
    expiresIn: string;
    refreshExpiresIn: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: string;
    audience: string;
    issuer: string;
    expiresIn: string;
    refreshExpiresIn: string;
}>;
export default _default;
