import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePurchaseLocations1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'purchase_locations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'eventId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'region',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'totalPurchases',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalTickets',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalRevenue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'averageTicketPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'purchaseDates',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ticketTypes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'trafficSources',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query('CREATE INDEX IDX_purchase_locations_event_country_city ON purchase_locations (eventId, country, city)');
    await queryRunner.query('CREATE INDEX IDX_purchase_locations_event_region ON purchase_locations (eventId, region)');
    await queryRunner.query('CREATE INDEX IDX_purchase_locations_event_created ON purchase_locations (eventId, createdAt)');
    await queryRunner.query('CREATE INDEX IDX_purchase_locations_coordinates ON purchase_locations (latitude, longitude)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('purchase_locations');
  }
} 