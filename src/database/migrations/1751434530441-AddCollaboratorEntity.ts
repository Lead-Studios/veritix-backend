import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollaboratorEntity1751434530441 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "collaborator" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "image" character varying NOT NULL,
                "email" character varying NOT NULL,
                "eventId" uuid,
                CONSTRAINT "PK_collaborator" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "collaborator" 
            ADD CONSTRAINT "FK_collaborator_event" 
            FOREIGN KEY ("eventId") 
            REFERENCES "event"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "collaborator" DROP CONSTRAINT "FK_collaborator_event"`,
    );
    await queryRunner.query(`DROP TABLE "collaborator"`);
  }
}
