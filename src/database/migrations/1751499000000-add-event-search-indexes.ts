import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventSearchIndexes1751499000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_name_trgm ON event USING gin (name gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_category ON event (category)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_country ON event (country)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_state ON event (state)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_city ON event (city)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_city`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_state`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_country`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_name_trgm`);
    // Do not drop pg_trgm extension in down
  }
} 