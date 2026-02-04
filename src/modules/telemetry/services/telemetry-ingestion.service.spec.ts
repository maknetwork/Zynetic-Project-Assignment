import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryIngestionService } from '../services/telemetry-ingestion.service';
import { MeterHandlerService } from '../services/meter-handler.service';
import { VehicleHandlerService } from '../services/vehicle-handler.service';
import { TelemetryType } from '../dto/telemetry-request.dto';

describe('TelemetryIngestionService', () => {
  let service: TelemetryIngestionService;
  let meterHandler: MeterHandlerService;
  let vehicleHandler: VehicleHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryIngestionService,
        {
          provide: MeterHandlerService,
          useValue: {
            processMeterReading: jest.fn(),
          },
        },
        {
          provide: VehicleHandlerService,
          useValue: {
            processVehicleReading: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelemetryIngestionService>(TelemetryIngestionService);
    meterHandler = module.get<MeterHandlerService>(MeterHandlerService);
    vehicleHandler = module.get<VehicleHandlerService>(VehicleHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestTelemetry', () => {
    it('should route meter readings to meter handler', async () => {
      const meterRequest = {
        type: TelemetryType.METER,
        payload: {
          meterId: 'MTR-001',
          kwhConsumedAc: 125.5,
          voltage: 240.2,
          timestamp: '2026-02-04T10:30:00Z',
        },
      };

      await service.ingestTelemetry(meterRequest);

      expect(meterHandler.processMeterReading).toHaveBeenCalledWith(meterRequest.payload);
      expect(vehicleHandler.processVehicleReading).not.toHaveBeenCalled();
    });

    it('should route vehicle readings to vehicle handler', async () => {
      const vehicleRequest = {
        type: TelemetryType.VEHICLE,
        payload: {
          vehicleId: 'VEH-001',
          soc: 75,
          kwhDeliveredDc: 105.2,
          batteryTemp: 32.5,
          timestamp: '2026-02-04T10:30:00Z',
        },
      };

      await service.ingestTelemetry(vehicleRequest);

      expect(vehicleHandler.processVehicleReading).toHaveBeenCalledWith(vehicleRequest.payload);
      expect(meterHandler.processMeterReading).not.toHaveBeenCalled();
    });
  });
});
