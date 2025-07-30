import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSponsorEntity1751433717717 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "sponsor" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "brandImage" character varying NOT NULL,
                "brandName" character varying NOT NULL,
                "brandWebsite" character varying NOT NULL,
                "facebook" character varying,
                "twitter" character varying,
                "instagram" character varying,
                "eventId" uuid,
                CONSTRAINT "PK_sponsor" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "sponsor" 
            ADD CONSTRAINT "FK_sponsor_event" 
            FOREIGN KEY ("eventId") 
            REFERENCES "event"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sponsor" DROP CONSTRAINT "FK_sponsor_event"`,
    );
    await queryRunner.query(`DROP TABLE "sponsor"`);
  }
}
