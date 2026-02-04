import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VehicleReadingDto } from '../dto/vehicle-reading.dto';
import { VehicleCurrent } from '../entities/vehicle-current.entity';
import { VehicleHistory } from '../entities/vehicle-history.entity';
import { VehicleMeterMapping } from '../entities/vehicle-meter-mapping.entity';

@Injectable()
export class VehicleHandlerService {
  private readonly logger = new Logger(VehicleHandlerService.name);

  constructor(
    @InjectRepository(VehicleCurrent)
    private vehicleCurrentRepo: Repository<VehicleCurrent>,
    @InjectRepository(VehicleHistory)
    private vehicleHistoryRepo: Repository<VehicleHistory>,
    @InjectRepository(VehicleMeterMapping)
    private mappingRepo: Repository<VehicleMeterMapping>,
    private dataSource: DataSource,
  ) {}

  async processVehicleReading(reading: VehicleReadingDto): Promise<void> {
    const recordedAt = new Date(reading.timestamp);

    // Derive meterId from vehicleId (assumption: VEH-XXXX -> MTR-XXXX)
    const meterId = reading.vehicleId.replace('VEH-', 'MTR-');

    await this.dataSource.transaction(async (manager) => {
      // Ensure vehicle-meter mapping exists
      const existingMapping = await manager.findOne(VehicleMeterMapping, {
        where: { vehicleId: reading.vehicleId },
      });

      if (!existingMapping) {
        await manager.insert(VehicleMeterMapping, {
          vehicleId: reading.vehicleId,
          meterId,
          location: `Auto-generated for ${reading.vehicleId}`,
          installationDate: new Date(),
        });
        this.logger.log(`Created vehicle-meter mapping: ${reading.vehicleId} -> ${meterId}`);
      }

      await manager.insert(VehicleHistory, {
        vehicleId: reading.vehicleId,
        soc: reading.soc,
        kwhDeliveredDc: reading.kwhDeliveredDc,
        batteryTemp: reading.batteryTemp,
        recordedAt,
      });

      await manager.upsert(
        VehicleCurrent,
        {
          vehicleId: reading.vehicleId,
          soc: reading.soc,
          kwhDeliveredDc: reading.kwhDeliveredDc,
          batteryTemp: reading.batteryTemp,
          chargingStatus: 'ACTIVE',
          lastUpdatedAt: recordedAt,
        },
        {
          conflictPaths: ['vehicleId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    this.logger.log(`Processed vehicle reading for ${reading.vehicleId}`);
  }
}
