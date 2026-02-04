import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateHotTables1707000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'meters_current',
        columns: [
          {
            name: 'meter_id',
            type: 'varchar',
            length: '50',
            isPrimary: true,
          },
          {
            name: 'kwh_consumed_ac',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'voltage',
            type: 'decimal',
            precision: 6,
            scale: 2,
          },
          {
            name: 'last_updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'vehicles_current',
        columns: [
          {
            name: 'vehicle_id',
            type: 'varchar',
            length: '50',
            isPrimary: true,
          },
          {
            name: 'soc',
            type: 'int',
          },
          {
            name: 'kwh_delivered_dc',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'battery_temp',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'charging_status',
            type: 'varchar',
            length: '20',
            default: "'ACTIVE'",
          },
          {
            name: 'last_updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'vehicle_meter_mapping',
        columns: [
          {
            name: 'vehicle_id',
            type: 'varchar',
            length: '50',
            isPrimary: true,
          },
          {
            name: 'meter_id',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'location',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'installation_date',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE INDEX idx_mapping_meter_id ON vehicle_meter_mapping(meter_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vehicle_meter_mapping');
    await queryRunner.dropTable('vehicles_current');
    await queryRunner.dropTable('meters_current');
  }
}
