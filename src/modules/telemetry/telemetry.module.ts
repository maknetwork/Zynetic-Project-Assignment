import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterCurrent } from './entities/meter-current.entity';
import { MeterHistory } from './entities/meter-history.entity';
import { VehicleCurrent } from './entities/vehicle-current.entity';
import { VehicleHistory } from './entities/vehicle-history.entity';
import { VehicleMeterMapping } from './entities/vehicle-meter-mapping.entity';
import { TelemetryIngestionController } from './controllers/telemetry-ingestion.controller';
import { TelemetryIngestionService } from './services/telemetry-ingestion.service';
import { MeterHandlerService } from './services/meter-handler.service';
import { VehicleHandlerService } from './services/vehicle-handler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeterCurrent,
      MeterHistory,
      VehicleCurrent,
      VehicleHistory,
      VehicleMeterMapping,
    ]),
  ],
  controllers: [TelemetryIngestionController],
  providers: [TelemetryIngestionService, MeterHandlerService, VehicleHandlerService],
  exports: [TelemetryIngestionService],
})
export class TelemetryModule {}
