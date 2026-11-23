import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [StockController],
  imports: [PrismaModule],
  providers: [StockService],
})
export class StockModule {}
