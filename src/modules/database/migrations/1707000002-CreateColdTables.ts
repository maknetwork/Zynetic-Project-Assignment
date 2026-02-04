import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateColdTables1707000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE meter_telemetry_history (
        id bigserial NOT NULL,
        meter_id varchar(50) NOT NULL,
        kwh_consumed_ac decimal(10,2) NOT NULL,
        voltage decimal(6,2) NOT NULL,
        recorded_at timestamp with time zone NOT NULL,
        ingested_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE vehicle_telemetry_history (
        id bigserial NOT NULL,
        vehicle_id varchar(50) NOT NULL,
        soc int NOT NULL,
        kwh_delivered_dc decimal(10,2) NOT NULL,
        battery_temp decimal(5,2) NOT NULL,
        recorded_at timestamp with time zone NOT NULL,
        ingested_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `SELECT create_hypertable('meter_telemetry_history', 'recorded_at', chunk_time_interval => INTERVAL '1 day')`,
    );

    await queryRunner.query(
      `SELECT create_hypertable('vehicle_telemetry_history', 'recorded_at', chunk_time_interval => INTERVAL '1 day')`,
    );

    await queryRunner.query(
      `ALTER TABLE meter_telemetry_history ADD CONSTRAINT meter_telemetry_history_pkey PRIMARY KEY (id, recorded_at)`,
    );

    await queryRunner.query(
      `ALTER TABLE vehicle_telemetry_history ADD CONSTRAINT vehicle_telemetry_history_pkey PRIMARY KEY (id, recorded_at)`,
    );

    await queryRunner.query(
      `ALTER TABLE meter_telemetry_history SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'meter_id'
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE vehicle_telemetry_history SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'vehicle_id'
      )`,
    );

    await queryRunner.query(
      `SELECT add_compression_policy('meter_telemetry_history', INTERVAL '7 days')`,
    );

    await queryRunner.query(
      `SELECT add_compression_policy('vehicle_telemetry_history', INTERVAL '7 days')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vehicle_telemetry_history');
    await queryRunner.dropTable('meter_telemetry_history');
  }
}
