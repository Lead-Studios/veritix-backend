import { AdminAuthService } from '../providers/admin-auth.services';
declare const AdminLocalStrategy_base: new (...args: any) => any;
export declare class AdminLocalStrategy extends AdminLocalStrategy_base {
    private adminAuthService;
    constructor(adminAuthService: AdminAuthService);
    validate(email: string, password: string): Promise<any>;
}
export {};
