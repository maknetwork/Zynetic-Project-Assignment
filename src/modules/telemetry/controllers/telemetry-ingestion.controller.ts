import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelemetryRequestDto } from '../dto/telemetry-request.dto';
import { TelemetryResponseDto } from '../dto/telemetry-response.dto';
import { TelemetryIngestionService } from '../services/telemetry-ingestion.service';

@ApiTags('Telemetry Ingestion')
@Controller('telemetry')
export class TelemetryIngestionController {
  constructor(private readonly ingestionService: TelemetryIngestionService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ingest telemetry data',
    description:
      'Accepts polymorphic telemetry readings from meters and vehicles. Data is persisted to both historical and current state tables.',
  })
  @ApiResponse({
    status: 202,
    description: 'Telemetry data accepted for processing',
    type: TelemetryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async ingestTelemetry(@Body() request: TelemetryRequestDto): Promise<TelemetryResponseDto> {
    await this.ingestionService.ingestTelemetry(request);

    return {
      success: true,
      message: 'Telemetry data ingested successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
