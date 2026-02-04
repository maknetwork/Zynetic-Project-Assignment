import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TelemetryRequestDto, TelemetryType } from '../dto/telemetry-request.dto';
import { MeterReadingDto } from '../dto/meter-reading.dto';
import { VehicleReadingDto } from '../dto/vehicle-reading.dto';
import { MeterHandlerService } from './meter-handler.service';
import { VehicleHandlerService } from './vehicle-handler.service';

@Injectable()
export class TelemetryIngestionService {
  private readonly logger = new Logger(TelemetryIngestionService.name);

  constructor(
    private meterHandler: MeterHandlerService,
    private vehicleHandler: VehicleHandlerService,
  ) {}

  async ingestTelemetry(request: TelemetryRequestDto): Promise<void> {
    try {
      // Polymorphic routing based on telemetry type
      switch (request.type) {
        case TelemetryType.METER:
          await this.meterHandler.processMeterReading(request.payload as MeterReadingDto);
          break;

        case TelemetryType.VEHICLE:
          await this.vehicleHandler.processVehicleReading(request.payload as VehicleReadingDto);
          break;

        default:
          throw new BadRequestException(`Unknown telemetry type: ${request.type}`);
      }

      this.logger.log(`Successfully ingested ${request.type} telemetry`);
    } catch (error) {
      this.logger.error(`Failed to ingest telemetry: ${error.message}`, error.stack);
      throw error;
    }
  }
}
