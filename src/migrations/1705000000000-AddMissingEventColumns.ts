import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMissingEventColumns1705000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('event', [
            new TableColumn({
                name: 'venue',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'city',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'countryCode',
                type: 'varchar',
                length: '2',
                isNullable: true,
            }),
            new TableColumn({
                name: 'tags',
                type: 'text',
                isArray: true,
                default: "'{}'",
            }),
            new TableColumn({
                name: 'isVirtual',
                type: 'boolean',
                default: false,
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('event', 'venue');
        await queryRunner.dropColumn('event', 'city');
        await queryRunner.dropColumn('event', 'countryCode');
        await queryRunner.dropColumn('event', 'tags');
        await queryRunner.dropColumn('event', 'isVirtual');
    }
}
