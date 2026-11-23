import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController],
  imports: [PrismaModule],
  providers: [StatsService],
})
export class StatsModule {}
