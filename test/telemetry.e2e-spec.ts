import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TelemetryType } from '../src/modules/telemetry/dto/telemetry-request.dto';

describe('Telemetry API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/v1/telemetry/ingest (POST)', () => {
    it('should accept valid meter reading', () => {
      const meterReading = {
        type: TelemetryType.METER,
        payload: {
          meterId: 'MTR-TEST-001',
          kwhConsumedAc: 125.5,
          voltage: 240.2,
          timestamp: new Date().toISOString(),
        },
      };

      return request(app.getHttpServer())
        .post('/v1/telemetry/ingest')
        .send(meterReading)
        .expect(202)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Telemetry data ingested successfully');
        });
    });

    it('should accept valid vehicle reading', () => {
      const vehicleReading = {
        type: TelemetryType.VEHICLE,
        payload: {
          vehicleId: 'VEH-TEST-001',
          soc: 75,
          kwhDeliveredDc: 105.2,
          batteryTemp: 32.5,
          timestamp: new Date().toISOString(),
        },
      };

      return request(app.getHttpServer())
        .post('/v1/telemetry/ingest')
        .send(vehicleReading)
        .expect(202)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should reject invalid telemetry type', () => {
      const invalidReading = {
        type: 'INVALID_TYPE',
        payload: {},
      };

      return request(app.getHttpServer())
        .post('/v1/telemetry/ingest')
        .send(invalidReading)
        .expect(400);
    });

    it('should reject missing required fields', () => {
      const incompleteReading = {
        type: TelemetryType.METER,
        payload: {
          meterId: 'MTR-001',
        },
      };

      return request(app.getHttpServer())
        .post('/v1/telemetry/ingest')
        .send(incompleteReading)
        .expect(400);
    });
  });

  describe('/v1/analytics/performance/:vehicleId (GET)', () => {
    beforeAll(async () => {
      const timestamp = new Date().toISOString();

      // Ingest meter data first
      const meterReading = {
        type: TelemetryType.METER,
        payload: {
          meterId: 'MTR-001',
          kwhConsumedAc: 125.0,
          voltage: 240.0,
          timestamp,
        },
      };

      // Ingest vehicle data with same timestamp
      const vehicleReading = {
        type: TelemetryType.VEHICLE,
        payload: {
          vehicleId: 'VEH-001',
          soc: 80,
          kwhDeliveredDc: 100.0,
          batteryTemp: 30.0,
          timestamp,
        },
      };

      await request(app.getHttpServer()).post('/v1/telemetry/ingest').send(meterReading);
      await request(app.getHttpServer()).post('/v1/telemetry/ingest').send(vehicleReading);
    });

    it('should return performance analytics for valid vehicle', () => {
      return request(app.getHttpServer())
        .get('/v1/analytics/performance/VEH-001')
        .expect(200)
        .expect((res) => {
          expect(res.body.vehicleId).toBe('VEH-001');
          expect(res.body.period).toBeDefined();
          expect(res.body.energyMetrics).toBeDefined();
          expect(res.body.batteryMetrics).toBeDefined();
          expect(res.body.hourlyBreakdown).toBeDefined();
        });
    });

    it('should return 404 for non-existent vehicle', () => {
      return request(app.getHttpServer())
        .get('/v1/analytics/performance/VEH-NONEXISTENT')
        .expect(404);
    });
  });
});
