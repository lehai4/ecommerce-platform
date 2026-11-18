import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersDto } from './dto/find-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderService } from './order.service';

type AuthUser = { userId: string; userRole: string };

/** Orders: checkout for customers, tracking for admins */
@ApiTags('order')
@ApiBearerAuth()
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Places an order with the items in the cart' })
  @Post()
  create(@Req() request: Request, @Body() dto: CreateOrderDto) {
    const { userId } = request.user as AuthUser;
    return this.orderService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Admin lists all orders (filter by status, search)' })
  @IsAdmin()
  @Get('admin')
  findAll(@Query() dto: FindOrdersDto) {
    return this.orderService.findAll(dto);
  }

  @ApiOperation({ summary: 'Admin gets order count and revenue per status' })
  @IsAdmin()
  @Get('admin/summary')
  summary() {
    return this.orderService.summary();
  }

  @ApiOperation({ summary: 'Customer lists their own orders' })
  @Get()
  findMine(@Req() request: Request, @Query() dto: FindOrdersDto) {
    const { userId } = request.user as AuthUser;
    return this.orderService.findAll(dto, userId);
  }

  @ApiOperation({ summary: 'Gets one order (customers only their own)' })
  @Get(':id')
  findOne(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { userId, userRole } = request.user as AuthUser;
    return this.orderService.findOne(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Admin changes the order status' })
  @IsAdmin()
  @Patch(':id/status')
  updateStatus(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const { userId } = request.user as AuthUser;
    return this.orderService.updateStatus(id, dto, userId);
  }

  @ApiOperation({ summary: 'Customer cancels their pending order' })
  @Patch(':id/cancel')
  cancel(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    const { userId } = request.user as AuthUser;
    return this.orderService.cancel(id, userId, dto.note);
  }
}
