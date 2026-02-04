import { IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MeterReadingDto } from './meter-reading.dto';
import { VehicleReadingDto } from './vehicle-reading.dto';

export enum TelemetryType {
  METER = 'METER',
  VEHICLE = 'VEHICLE',
}

export class TelemetryRequestDto {
  @ApiProperty({ enum: TelemetryType, example: TelemetryType.METER })
  @IsNotEmpty()
  @IsEnum(TelemetryType)
  type: TelemetryType;

  @ApiProperty({
    oneOf: [{ $ref: '#/components/schemas/MeterReadingDto' }, { $ref: '#/components/schemas/VehicleReadingDto' }],
    description: 'Telemetry payload - either MeterReadingDto or VehicleReadingDto',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type((options) => {
    if (options?.object?.type === TelemetryType.METER) {
      return MeterReadingDto;
    }
    return VehicleReadingDto;
  })
  payload: MeterReadingDto | VehicleReadingDto;
}
