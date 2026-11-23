import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { FindStockMovementsDto } from './dto/find-stock-movements.dto';
import { StockService } from './stock.service';

/** Stock history and manual stock changes, admins only */
@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ApiOperation({ summary: 'Admin lists stock changes (filters, pagination)' })
  @IsAdmin()
  @Get('movements')
  findAll(@Query() dto: FindStockMovementsDto) {
    return this.stockService.findAll(dto);
  }

  @ApiOperation({ summary: 'Admin adds or removes stock with a reason' })
  @IsAdmin()
  @Post(':productId/adjust')
  adjust(
    @Req() request: Request,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    const { userId } = request.user as { userId: string };
    return this.stockService.adjust(productId, dto, userId);
  }
}
