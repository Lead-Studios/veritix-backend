import { AdminService } from './providers/admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    create(createAdminDto: CreateAdminDto): Promise<{
        message: string;
        adminId: number;
    }>;
    findAll(): Promise<Partial<import("./entities/admin.entity").Admin>[]>;
    findOne(id: string): Promise<Partial<import("./entities/admin.entity").Admin>>;
    update(id: string, updateAdminDto: UpdateAdminDto): Promise<{
        message: string;
        adminId: number;
    }>;
    remove(id: string): Promise<{
        message: string;
        adminId: number;
    }>;
}
