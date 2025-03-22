import { SetMetadata } from "@nestjs/common";
import { AuthType } from "../../src/common/enums/auth-type.enum";

export const AUTH_KEY = "authType";

export const Auth = (type: AuthType = AuthType.Bearer) =>
  SetMetadata(AUTH_KEY, type);
