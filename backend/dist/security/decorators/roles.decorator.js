"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleDecorator = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
const RoleDecorator = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.RoleDecorator = RoleDecorator;
//# sourceMappingURL=roles.decorator.js.map