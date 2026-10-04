import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, type HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and PostgreSQL availability' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', database: 'up' },
    },
  })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
