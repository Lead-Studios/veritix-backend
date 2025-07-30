import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RevenueForecastService } from './revenue-forecast.service';
import {
  RevenueForecastQueryDto,
  RevenueForecastResponseDto,
} from './revenue-forecast.dto';

@ApiTags('Revenue Forecast')
@Controller('revenue-forecast')
export class RevenueForecastController {
  constructor(
    private readonly revenueForecastService: RevenueForecastService,
  ) {}

  @Get('predict')
  @ApiOperation({
    summary: 'Generate revenue forecast based on ticket sales trends',
    description:
      'Uses linear regression to predict future revenue from ongoing ticket sales. Supports filtering by event, timeframe, and price tier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue forecast generated successfully',
    type: RevenueForecastResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters or insufficient data',
  })
  async predictRevenue(
    @Query() query: RevenueForecastQueryDto,
  ): Promise<RevenueForecastResponseDto> {
    return this.revenueForecastService.generateForecast(query);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for revenue forecast service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
