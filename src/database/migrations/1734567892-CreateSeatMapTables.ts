import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSeatMapTables1734567892 implements MigrationInterface {
  name = 'CreateSeatMapTables1734567892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create seat_maps table
    await queryRunner.createTable(
      new Table({
        name: 'seat_maps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'venueName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'totalCapacity',
            type: 'int',
          },
          {
            name: 'layout',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'eventId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create sections table
    await queryRunner.createTable(
      new Table({
        name: 'sections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['orchestra', 'balcony', 'mezzanine', 'box', 'general_admission', 'vip', 'standing'],
          },
          {
            name: 'basePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'capacity',
            type: 'int',
          },
          {
            name: 'position',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'seatLayout',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'seatMapId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create seats table
    await queryRunner.createTable(
      new Table({
        name: 'seats',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'row',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'number',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'label',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['available', 'sold', 'held', 'blocked', 'wheelchair_accessible'],
            default: "'available'",
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['standard', 'premium', 'wheelchair', 'companion', 'aisle'],
            default: "'standard'",
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'position',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'heldUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'holdReference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sectionId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create seat_assignments table
    await queryRunner.createTable(
      new Table({
        name: 'seat_assignments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['assigned', 'transferred', 'cancelled'],
            default: "'assigned'",
          },
          {
            name: 'purchaseReference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'assignedPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
          },
          {
            name: 'transferredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'transferReference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'seatId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ticketId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'transferredFromUserId',
            type: 'uuid',
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
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'seat_maps',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'event',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sections',
      new TableForeignKey({
        columnNames: ['seatMapId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'seat_maps',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'seats',
      new TableForeignKey({
        columnNames: ['sectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sections',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'seat_assignments',
      new TableForeignKey({
        columnNames: ['seatId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'seats',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'IDX_seat_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'IDX_seat_section_row',
        columnNames: ['sectionId', 'row'],
      }),
    );

    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'IDX_seat_held_until',
        columnNames: ['heldUntil'],
      }),
    );

    await queryRunner.createIndex(
      'seat_assignments',
      new TableIndex({
        name: 'IDX_assignment_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'seat_assignments',
      new TableIndex({
        name: 'IDX_assignment_ticket',
        columnNames: ['ticketId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const seatMapTable = await queryRunner.getTable('seat_maps');
    const sectionsTable = await queryRunner.getTable('sections');
    const seatsTable = await queryRunner.getTable('seats');
    const seatAssignmentsTable = await queryRunner.getTable('seat_assignments');

    if (seatAssignmentsTable) {
      const seatAssignmentForeignKeys = seatAssignmentsTable.foreignKeys;
      for (const foreignKey of seatAssignmentForeignKeys) {
        await queryRunner.dropForeignKey('seat_assignments', foreignKey);
      }
    }

    if (seatsTable) {
      const seatsForeignKeys = seatsTable.foreignKeys;
      for (const foreignKey of seatsForeignKeys) {
        await queryRunner.dropForeignKey('seats', foreignKey);
      }
    }

    if (sectionsTable) {
      const sectionsForeignKeys = sectionsTable.foreignKeys;
      for (const foreignKey of sectionsForeignKeys) {
        await queryRunner.dropForeignKey('sections', foreignKey);
      }
    }

    if (seatMapTable) {
      const seatMapForeignKeys = seatMapTable.foreignKeys;
      for (const foreignKey of seatMapForeignKeys) {
        await queryRunner.dropForeignKey('seat_maps', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('seat_assignments');
    await queryRunner.dropTable('seats');
    await queryRunner.dropTable('sections');
    await queryRunner.dropTable('seat_maps');
  }
}
