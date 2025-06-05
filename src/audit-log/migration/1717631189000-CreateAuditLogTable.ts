import { MigrationInterface, QueryRunner } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

export class CreateAuditLogTable1717631189000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create-audit-log-table.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Execute the SQL commands
        await queryRunner.query(sqlContent);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_admin_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_type"`);
        
        // Drop the table
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
    }
}
