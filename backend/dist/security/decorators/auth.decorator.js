"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = exports.AUTH_KEY = void 0;
const common_1 = require("@nestjs/common");
const auth_type_enum_1 = require("../../src/common/enums/auth-type.enum");
exports.AUTH_KEY = 'authType';
const Auth = (type = auth_type_enum_1.AuthType.Bearer) => (0, common_1.SetMetadata)(exports.AUTH_KEY, type);
exports.Auth = Auth;
//# sourceMappingURL=auth.decorator.js.map