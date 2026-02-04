import { IsNotEmpty, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VehicleReadingDto {
  @ApiProperty({ example: 'VEH-001', description: 'Unique vehicle identifier' })
  @IsNotEmpty()
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 75, description: 'State of Charge (Battery %)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  soc: number;

  @ApiProperty({ example: 105.2, description: 'DC power delivered to battery in kWh' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  kwhDeliveredDc: number;

  @ApiProperty({ example: 32.5, description: 'Battery temperature in Celsius' })
  @IsNotEmpty()
  @IsNumber()
  @Min(-40)
  @Max(100)
  batteryTemp: number;

  @ApiProperty({ example: '2026-02-04T10:30:00Z', description: 'ISO 8601 timestamp' })
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;
}
