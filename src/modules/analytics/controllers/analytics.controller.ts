import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { PerformanceResponseDto } from '../dto/performance-response.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('performance/:vehicleId')
  @ApiOperation({
    summary: 'Get vehicle performance analytics',
    description:
      'Returns 24-hour performance summary including energy consumption, efficiency ratio, and battery metrics. Correlates meter and vehicle data.',
  })
  @ApiParam({ name: 'vehicleId', example: 'VEH-001', description: 'Vehicle identifier' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2026-02-03T10:30:00Z',
    description: 'Start date (ISO 8601). Defaults to 24 hours ago.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2026-02-04T10:30:00Z',
    description: 'End date (ISO 8601). Defaults to now.',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance analytics retrieved successfully',
    type: PerformanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPerformance(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PerformanceResponseDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getPerformanceAnalytics(vehicleId, start, end);
  }
}
