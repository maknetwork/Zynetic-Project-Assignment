import { ApiProperty } from '@nestjs/swagger';

export class EnergyMetricsDto {
  @ApiProperty({ example: 125.5, description: 'Total AC energy consumed in kWh' })
  totalAcConsumed: number;

  @ApiProperty({ example: 105.2, description: 'Total DC energy delivered in kWh' })
  totalDcDelivered: number;

  @ApiProperty({ example: 0.838, description: 'Efficiency ratio (DC/AC)' })
  efficiencyRatio: number;

  @ApiProperty({ example: 20.3, description: 'Power loss in kWh' })
  powerLoss: number;
}

export class BatteryMetricsDto {
  @ApiProperty({ example: 32.5, description: 'Average battery temperature in Celsius' })
  avgTemperature: number;

  @ApiProperty({ example: 38.2, description: 'Maximum battery temperature in Celsius' })
  maxTemperature: number;

  @ApiProperty({ example: 28.1, description: 'Minimum battery temperature in Celsius' })
  minTemperature: number;
}

export class HourlyBreakdownDto {
  @ApiProperty({ example: '2026-02-04T10:00:00Z', description: 'Hour timestamp' })
  hour: string;

  @ApiProperty({ example: 5.2, description: 'AC consumed in this hour' })
  acConsumed: number;

  @ApiProperty({ example: 4.4, description: 'DC delivered in this hour' })
  dcDelivered: number;

  @ApiProperty({ example: 0.846, description: 'Efficiency for this hour' })
  efficiency: number;
}

export class PeriodDto {
  @ApiProperty({ example: '2026-02-03T10:30:00Z' })
  start: string;

  @ApiProperty({ example: '2026-02-04T10:30:00Z' })
  end: string;
}

export class PerformanceResponseDto {
  @ApiProperty({ example: 'VEH-001' })
  vehicleId: string;

  @ApiProperty({ type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ type: EnergyMetricsDto })
  energyMetrics: EnergyMetricsDto;

  @ApiProperty({ type: BatteryMetricsDto })
  batteryMetrics: BatteryMetricsDto;

  @ApiProperty({ type: [HourlyBreakdownDto] })
  hourlyBreakdown: HourlyBreakdownDto[];
}
