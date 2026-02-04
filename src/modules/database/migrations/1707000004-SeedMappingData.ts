import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMappingData1707000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed sample vehicle-meter mappings for testing
    // In production, this data would be loaded from a configuration file or admin panel

    const mappings: string[] = [];
    for (let i = 1; i <= 100; i++) {
      const vehicleId = `VEH-${String(i).padStart(3, '0')}`;
      const meterId = `MTR-${String(i).padStart(3, '0')}`;
      mappings.push(
        `('${vehicleId}', '${meterId}', 'Charging Station ${i}', CURRENT_TIMESTAMP)`,
      );
    }

    // Insert in batches of 50
    for (let i = 0; i < mappings.length; i += 50) {
      const batch = mappings.slice(i, i + 50).join(',\n    ');
      await queryRunner.query(`
        INSERT INTO vehicle_meter_mapping (vehicle_id, meter_id, location, installation_date)
        VALUES
          ${batch}
        ON CONFLICT (vehicle_id) DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM vehicle_meter_mapping WHERE vehicle_id LIKE 'VEH-%'`);
  }
}
