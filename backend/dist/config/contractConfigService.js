"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('contractService', () => {
    return {
        contractAddress: process.env.CONTRACT_ADDRESS,
        contractAbi: process.env.CONTRACT_ABI,
        adminSigner: process.env.ADMIN_SIGNER,
    };
});
//# sourceMappingURL=contractConfigService.js.map