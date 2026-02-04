import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VehicleReadingDto } from '../dto/vehicle-reading.dto';
import { VehicleCurrent } from '../entities/vehicle-current.entity';
import { VehicleHistory } from '../entities/vehicle-history.entity';

@Injectable()
export class VehicleHandlerService {
  private readonly logger = new Logger(VehicleHandlerService.name);

  constructor(
    @InjectRepository(VehicleCurrent)
    private vehicleCurrentRepo: Repository<VehicleCurrent>,
    @InjectRepository(VehicleHistory)
    private vehicleHistoryRepo: Repository<VehicleHistory>,
    private dataSource: DataSource,
  ) {}

  async processVehicleReading(reading: VehicleReadingDto): Promise<void> {
    const recordedAt = new Date(reading.timestamp);

    await this.dataSource.transaction(async (manager) => {
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
