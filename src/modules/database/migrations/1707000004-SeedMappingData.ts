import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMappingData1707000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed sample vehicle-meter mappings for testing
    // In production, this data would be loaded from a configuration file or admin panel

    const mappings: string[] = [];
    for (let i = 1; i <= 10000; i++) {
      const vehicleId = `VEH-${String(i).padStart(4, '0')}`;
      const meterId = `MTR-${String(i).padStart(4, '0')}`;
      const location = `Charging Station ${i} - Zone ${Math.ceil(i / 100)}`;
      mappings.push(
        `('${vehicleId}', '${meterId}', '${location}', CURRENT_TIMESTAMP)`,
      );
    }

    // Insert in batches of 100
    for (let i = 0; i < mappings.length; i += 100) {
      const batch = mappings.slice(i, i + 100).join(',\n    ');
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
