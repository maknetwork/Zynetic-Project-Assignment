import { IsNotEmpty, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MeterReadingDto {
  @ApiProperty({ example: 'MTR-001', description: 'Unique meter identifier' })
  @IsNotEmpty()
  @IsString()
  meterId: string;

  @ApiProperty({ example: 125.5, description: 'AC power consumed in kWh' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  kwhConsumedAc: number;

  @ApiProperty({ example: 240.2, description: 'Voltage reading' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(500)
  voltage: number;

  @ApiProperty({ example: '2026-02-04T10:30:00Z', description: 'ISO 8601 timestamp' })
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;
}
