import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../services/analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VehicleMeterMapping } from '../../telemetry/entities/vehicle-meter-mapping.entity';
import { NotFoundException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockMappingRepo: any;

  beforeEach(async () => {
    mockMappingRepo = {
      findOne: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(VehicleMeterMapping),
          useValue: mockMappingRepo,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPerformanceAnalytics', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      mockMappingRepo.findOne.mockResolvedValue(null);

      await expect(service.getPerformanceAnalytics('VEH-999')).rejects.toThrow(NotFoundException);
    });

    it('should return performance analytics for valid vehicle', async () => {
      const mockMapping = {
        vehicleId: 'VEH-001',
        meterId: 'MTR-001',
      };

      const mockHourlyData = [
        {
          hour: new Date('2026-02-04T10:00:00Z'),
          ac_consumed: '10.5',
          dc_delivered: '8.9',
          efficiency: '0.847',
        },
      ];

      const mockBatteryData = [
        {
          avg_temp: '32.5',
          max_temp: '35.2',
          min_temp: '30.1',
        },
      ];

      mockMappingRepo.findOne.mockResolvedValue(mockMapping);
      mockMappingRepo.query
        .mockResolvedValueOnce(mockHourlyData)
        .mockResolvedValueOnce(mockBatteryData);

      const result = await service.getPerformanceAnalytics('VEH-001');

      expect(result.vehicleId).toBe('VEH-001');
      expect(result.energyMetrics).toBeDefined();
      expect(result.batteryMetrics).toBeDefined();
      expect(result.hourlyBreakdown).toHaveLength(1);
    });
  });
});
