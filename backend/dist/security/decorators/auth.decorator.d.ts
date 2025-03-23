import { AuthType } from '../../src/common/enums/auth-type.enum';
export declare const AUTH_KEY = "authType";
export declare const Auth: (type?: AuthType) => import("@nestjs/common").CustomDecorator<string>;
