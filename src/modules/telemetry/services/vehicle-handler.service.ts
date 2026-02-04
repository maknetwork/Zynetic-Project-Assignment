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

    // Dual-write pattern using transaction
    await this.dataSource.transaction(async (manager) => {
      // Write 1: Insert into history table (append-only)
      await manager.insert(VehicleHistory, {
        vehicleId: reading.vehicleId,
        soc: reading.soc,
        kwhDeliveredDc: reading.kwhDeliveredDc,
        batteryTemp: reading.batteryTemp,
        recordedAt,
      });

      // Write 2: Upsert into current state table
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
