import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleMeterMapping } from '../../telemetry/entities/vehicle-meter-mapping.entity';
import {
  PerformanceResponseDto,
  EnergyMetricsDto,
  BatteryMetricsDto,
  HourlyBreakdownDto,
} from '../dto/performance-response.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(VehicleMeterMapping)
    private mappingRepo: Repository<VehicleMeterMapping>,
  ) {}

  async getPerformanceAnalytics(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PerformanceResponseDto> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const mapping = await this.mappingRepo.findOne({
      where: { vehicleId },
    });

    if (!mapping) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const hourlyData = await this.getHourlyBreakdown(vehicleId, mapping.meterId, start, end);

    const energyMetrics = this.calculateEnergyMetrics(hourlyData);
    const batteryMetrics = await this.getBatteryMetrics(vehicleId, start, end);

    this.logger.log(
      `Generated performance analytics for ${vehicleId} from ${start.toISOString()} to ${end.toISOString()}`,
    );

    return {
      vehicleId,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      energyMetrics,
      batteryMetrics,
      hourlyBreakdown: hourlyData,
    };
  }

  private async getHourlyBreakdown(
    vehicleId: string,
    meterId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HourlyBreakdownDto[]> {
    const query = `
      SELECT 
        DATE_TRUNC('hour', v.recorded_at) as hour,
        COALESCE(SUM(v.kwh_delivered_dc), 0) as dc_delivered,
        COALESCE(SUM(m.kwh_consumed_ac), 0) as ac_consumed,
        CASE 
          WHEN SUM(m.kwh_consumed_ac) > 0 
          THEN SUM(v.kwh_delivered_dc) / SUM(m.kwh_consumed_ac)
          ELSE 0 
        END as efficiency
      FROM vehicle_telemetry_history v
      LEFT JOIN meter_telemetry_history m 
        ON m.meter_id = $2
        AND m.recorded_at BETWEEN v.recorded_at - INTERVAL '5 seconds' 
                              AND v.recorded_at + INTERVAL '5 seconds'
      WHERE v.vehicle_id = $1
        AND v.recorded_at >= $3
        AND v.recorded_at < $4
      GROUP BY DATE_TRUNC('hour', v.recorded_at)
      ORDER BY hour DESC
    `;

    const results = await this.mappingRepo.query(query, [
      vehicleId,
      meterId,
      startDate,
      endDate,
    ]);

    return results.map((row) => ({
      hour: row.hour.toISOString(),
      acConsumed: parseFloat(row.ac_consumed),
      dcDelivered: parseFloat(row.dc_delivered),
      efficiency: parseFloat(row.efficiency),
    }));
  }

  private calculateEnergyMetrics(hourlyData: HourlyBreakdownDto[]): EnergyMetricsDto {
    const totalAcConsumed = hourlyData.reduce((sum, h) => sum + h.acConsumed, 0);
    const totalDcDelivered = hourlyData.reduce((sum, h) => sum + h.dcDelivered, 0);
    const efficiencyRatio = totalAcConsumed > 0 ? totalDcDelivered / totalAcConsumed : 0;
    const powerLoss = totalAcConsumed - totalDcDelivered;

    return {
      totalAcConsumed: Math.round(totalAcConsumed * 100) / 100,
      totalDcDelivered: Math.round(totalDcDelivered * 100) / 100,
      efficiencyRatio: Math.round(efficiencyRatio * 1000) / 1000,
      powerLoss: Math.round(powerLoss * 100) / 100,
    };
  }

  private async getBatteryMetrics(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BatteryMetricsDto> {
    const query = `
      SELECT 
        AVG(battery_temp) as avg_temp,
        MAX(battery_temp) as max_temp,
        MIN(battery_temp) as min_temp
      FROM vehicle_telemetry_history
      WHERE vehicle_id = $1
        AND recorded_at >= $2
        AND recorded_at < $3
    `;

    const results = await this.mappingRepo.query(query, [vehicleId, startDate, endDate]);
    const row = results[0];

    return {
      avgTemperature: parseFloat(row.avg_temp) || 0,
      maxTemperature: parseFloat(row.max_temp) || 0,
      minTemperature: parseFloat(row.min_temp) || 0,
    };
  }
}
