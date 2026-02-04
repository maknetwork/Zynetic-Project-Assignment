import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1707000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_meter_history_composite 
       ON meter_telemetry_history(meter_id, recorded_at DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_meter_history_recorded_at 
       ON meter_telemetry_history(recorded_at DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_vehicle_history_composite 
       ON vehicle_telemetry_history(vehicle_id, recorded_at DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_vehicle_history_recorded_at 
       ON vehicle_telemetry_history(recorded_at DESC)`,
    );

    await queryRunner.query(
      `SELECT add_retention_policy('meter_telemetry_history', INTERVAL '365 days')`,
    );

    await queryRunner.query(
      `SELECT add_retention_policy('vehicle_telemetry_history', INTERVAL '365 days')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vehicle_history_recorded_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vehicle_history_composite`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meter_history_recorded_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meter_history_composite`);
  }
}
