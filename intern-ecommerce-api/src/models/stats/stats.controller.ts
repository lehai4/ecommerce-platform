import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { StatsService } from './stats.service';

/** Reports for the admin dashboard */
@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @ApiOperation({
    summary:
      'Admin dashboard: KPIs vs previous period, daily sales, top products/categories, low stock',
  })
  @IsAdmin()
  @Get('dashboard')
  dashboard(@Query() dto: DashboardQueryDto) {
    return this.statsService.dashboard(dto);
  }
}
