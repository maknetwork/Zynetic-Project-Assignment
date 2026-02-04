import { ApiProperty } from '@nestjs/swagger';

export class TelemetryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Telemetry data ingested successfully' })
  message: string;

  @ApiProperty({ example: '2026-02-04T10:30:15Z' })
  timestamp: string;
}
