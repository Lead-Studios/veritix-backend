import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAnnouncementTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create announcement_delivery table first (referenced by announcement)
    await queryRunner.createTable(
      new Table({
        name: 'announcement_delivery',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'announcementId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['email', 'in_app'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'sent', 'failed', 'read'],
            default: "'pending'",
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create announcement table
    await queryRunner.createTable(
      new Table({
        name: 'announcement',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['general', 'schedule_change', 'venue_change', 'cancellation', 'special_offer', 'reminder'],
            default: "'general'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
          },
          {
            name: 'eventId',
            type: 'uuid',
          },
          {
            name: 'createdById',
            type: 'uuid',
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: false,
          },
          {
            name: 'scheduledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sendEmail',
            type: 'boolean',
            default: false,
          },
          {
            name: 'sendInApp',
            type: 'boolean',
            default: true,
          },
          {
            name: 'emailSentCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'inAppSentCount',
            type: 'int',
            default: 0,
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
    await queryRunner.createIndex(
      'announcement',
      new TableIndex({
        name: 'IDX_ANNOUNCEMENT_EVENT',
        columnNames: ['eventId'],
      }),
    );

    await queryRunner.createIndex(
      'announcement_delivery',
      new TableIndex({
        name: 'IDX_ANNOUNCEMENT_DELIVERY_ANNOUNCEMENT',
        columnNames: ['announcementId'],
      }),
    );

    await queryRunner.createIndex(
      'announcement_delivery',
      new TableIndex({
        name: 'IDX_ANNOUNCEMENT_DELIVERY_USER',
        columnNames: ['userId'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'announcement',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'event',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'announcement',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'announcement_delivery',
      new TableForeignKey({
        columnNames: ['announcementId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'announcement',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'announcement_delivery',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const announcementTable = await queryRunner.getTable('announcement');
    const announcementDeliveryTable = await queryRunner.getTable('announcement_delivery');

    if (announcementTable) {
      const foreignKeys = announcementTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('announcement', foreignKey);
      }
    }

    if (announcementDeliveryTable) {
      const foreignKeys = announcementDeliveryTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('announcement_delivery', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('announcement_delivery');
    await queryRunner.dropTable('announcement');
  }
} 