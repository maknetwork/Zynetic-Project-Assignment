import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTelemetryData1707000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed historical telemetry data for realistic analytics
    // Generate data for the past 48 hours at 5-minute intervals for first 1000 vehicles

    const now = new Date();
    const hoursBack = 48;
    const intervalMinutes = 5;
    const numberOfVehicles = 1000; // Seed data for first 1000 vehicles

    console.log('Seeding telemetry data... This may take a few minutes.');

    // Generate timestamps for the past 48 hours
    const timestamps: Date[] = [];
    for (let h = hoursBack; h >= 0; h--) {
      for (let m = 0; m < 60; m += intervalMinutes) {
        const timestamp = new Date(now.getTime() - h * 60 * 60 * 1000 - m * 60 * 1000);
        timestamps.push(timestamp);
      }
    }

    console.log(`Generating ${timestamps.length} readings for ${numberOfVehicles} vehicles...`);

    // Insert vehicle telemetry history in batches
    const vehicleBatchSize = 50;
    const timestampBatchSize = 100;

    for (let v = 1; v <= numberOfVehicles; v += vehicleBatchSize) {
      const vehicleEnd = Math.min(v + vehicleBatchSize - 1, numberOfVehicles);

      for (let t = 0; t < timestamps.length; t += timestampBatchSize) {
        const vehicleReadings: string[] = [];
        const meterReadings: string[] = [];

        for (let vid = v; vid <= vehicleEnd; vid++) {
          const vehicleId = `VEH-${String(vid).padStart(4, '0')}`;
          const meterId = `MTR-${String(vid).padStart(4, '0')}`;

          for (let tid = t; tid < Math.min(t + timestampBatchSize, timestamps.length); tid++) {
            const timestamp = timestamps[tid];

            // Simulate realistic charging session data
            const baseChargingPower = 50 + Math.random() * 100; // 50-150 kW
            const chargingEfficiency = 0.85 + Math.random() * 0.1; // 85-95% efficiency
            const sessionProgress = (tid / timestamps.length) % 1; // Session progress

            // Vehicle data (DC side)
            const soc = Math.min(20 + Math.floor(sessionProgress * 80), 100);
            const kwhDeliveredDc =
              baseChargingPower * (intervalMinutes / 60) * (0.8 + Math.random() * 0.4);
            const batteryTemp = 25 + sessionProgress * 15 + Math.random() * 5;
            const chargingStatus = soc >= 95 ? 'COMPLETE' : 'ACTIVE';

            vehicleReadings.push(
              `('${vehicleId}', ${soc}, ${kwhDeliveredDc.toFixed(2)}, ${batteryTemp.toFixed(2)}, '${timestamp.toISOString()}')`,
            );

            // Meter data (AC side) - includes charging losses
            const kwhConsumedAc = kwhDeliveredDc / chargingEfficiency;
            const voltage = 220 + Math.random() * 20; // 220-240V

            meterReadings.push(
              `('${meterId}', ${kwhConsumedAc.toFixed(2)}, ${voltage.toFixed(2)}, '${timestamp.toISOString()}')`,
            );
          }
        }

        // Insert vehicle telemetry batch
        if (vehicleReadings.length > 0) {
          await queryRunner.query(`
            INSERT INTO vehicle_telemetry_history 
              (vehicle_id, soc, kwh_delivered_dc, battery_temp, recorded_at)
            VALUES
              ${vehicleReadings.join(',\n    ')}
          `);
        }

        // Insert meter telemetry batch
        if (meterReadings.length > 0) {
          await queryRunner.query(`
            INSERT INTO meter_telemetry_history 
              (meter_id, kwh_consumed_ac, voltage, recorded_at)
            VALUES
              ${meterReadings.join(',\n    ')}
          `);
        }

        // Log progress
        const progress = (
          ((v - 1 + (vehicleEnd - v + 1) * (t / timestamps.length)) / numberOfVehicles) *
          100
        ).toFixed(1);
        console.log(
          `Progress: ${progress}% (Vehicles ${v}-${vehicleEnd}, Timestamps ${t}-${Math.min(t + timestampBatchSize, timestamps.length)})`,
        );
      }
    }

    // Also update current tables with the latest readings
    console.log('Updating current tables with latest readings...');

    const currentVehicleReadings: string[] = [];
    const currentMeterReadings: string[] = [];

    for (let i = 1; i <= numberOfVehicles; i++) {
      const vehicleId = `VEH-${String(i).padStart(4, '0')}`;
      const meterId = `MTR-${String(i).padStart(4, '0')}`;

      const soc = Math.floor(20 + Math.random() * 80);
      const kwhDeliveredDc = (50 + Math.random() * 100) * (intervalMinutes / 60);
      const batteryTemp = 30 + Math.random() * 10;
      const chargingStatus = soc >= 95 ? 'COMPLETE' : 'ACTIVE';

      currentVehicleReadings.push(
        `('${vehicleId}', ${soc}, ${kwhDeliveredDc.toFixed(2)}, ${batteryTemp.toFixed(2)}, '${chargingStatus}')`,
      );

      const kwhConsumedAc = kwhDeliveredDc / (0.85 + Math.random() * 0.1);
      const voltage = 220 + Math.random() * 20;

      currentMeterReadings.push(
        `('${meterId}', ${kwhConsumedAc.toFixed(2)}, ${voltage.toFixed(2)})`,
      );
    }

    // Insert current vehicle data in batches
    for (let i = 0; i < currentVehicleReadings.length; i += 100) {
      const batch = currentVehicleReadings.slice(i, i + 100).join(',\n    ');
      await queryRunner.query(`
        INSERT INTO vehicles_current 
          (vehicle_id, soc, kwh_delivered_dc, battery_temp, charging_status)
        VALUES
          ${batch}
        ON CONFLICT (vehicle_id) 
        DO UPDATE SET
          soc = EXCLUDED.soc,
          kwh_delivered_dc = EXCLUDED.kwh_delivered_dc,
          battery_temp = EXCLUDED.battery_temp,
          charging_status = EXCLUDED.charging_status,
          last_updated_at = CURRENT_TIMESTAMP
      `);
    }

    // Insert current meter data in batches
    for (let i = 0; i < currentMeterReadings.length; i += 100) {
      const batch = currentMeterReadings.slice(i, i + 100).join(',\n    ');
      await queryRunner.query(`
        INSERT INTO meters_current 
          (meter_id, kwh_consumed_ac, voltage)
        VALUES
          ${batch}
        ON CONFLICT (meter_id) 
        DO UPDATE SET
          kwh_consumed_ac = EXCLUDED.kwh_consumed_ac,
          voltage = EXCLUDED.voltage,
          last_updated_at = CURRENT_TIMESTAMP
      `);
    }

    console.log('Telemetry data seeding completed!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Clean up seeded telemetry data
    await queryRunner.query(`DELETE FROM vehicle_telemetry_history WHERE vehicle_id LIKE 'VEH-%'`);
    await queryRunner.query(`DELETE FROM meter_telemetry_history WHERE meter_id LIKE 'MTR-%'`);
    await queryRunner.query(`DELETE FROM vehicles_current WHERE vehicle_id LIKE 'VEH-%'`);
    await queryRunner.query(`DELETE FROM meters_current WHERE meter_id LIKE 'MTR-%'`);
  }
}
