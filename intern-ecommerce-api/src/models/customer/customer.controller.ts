import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { CustomerService } from './customer.service';
import { FindCustomersDto } from './dto/find-customers.dto';
import {
  BlockCustomerDto,
  UpdateCustomerRoleDto,
} from './dto/update-customer.dto';

type AuthUser = { userId: string };

/** Customer management, admins only */
@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({ summary: 'Admin lists customers with order stats' })
  @IsAdmin()
  @Get()
  findAll(@Query() dto: FindCustomersDto) {
    return this.customerService.findAll(dto);
  }

  @ApiOperation({ summary: 'Admin gets a customer with stats, addresses and orders' })
  @IsAdmin()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.findOne(id);
  }

  @ApiOperation({ summary: 'Admin changes a user role' })
  @IsAdmin()
  @Patch(':id/role')
  updateRole(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerRoleDto,
  ) {
    const { userId } = request.user as AuthUser;
    return this.customerService.updateRole(id, dto.role, userId);
  }

  @ApiOperation({ summary: 'Admin locks or unlocks an account' })
  @IsAdmin()
  @Patch(':id/block')
  setBlocked(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockCustomerDto,
  ) {
    const { userId } = request.user as AuthUser;
    return this.customerService.setBlocked(id, dto.blocked, userId);
  }
}
