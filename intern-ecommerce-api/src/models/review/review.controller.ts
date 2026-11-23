import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/auth/public.decorator';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import {
  AdminFindReviewsDto,
  FindProductReviewsDto,
} from './dto/find-reviews.dto';
import { ReviewReplyDto, ReviewStatusDto } from './dto/moderate-review.dto';
import { ReviewService } from './review.service';

type AuthUser = { userId: string };

/** Product reviews */
@ApiTags('review')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Visible reviews of a product with the rating summary' })
  @Public()
  @Get('product/:productId')
  findForProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() dto: FindProductReviewsDto,
  ) {
    return this.reviewService.findForProduct(productId, dto);
  }

  @ApiOperation({ summary: 'Customer: my reviews and products waiting for a review' })
  @ApiBearerAuth()
  @Get('mine')
  mine(@Req() request: Request) {
    return this.reviewService.mine((request.user as AuthUser).userId);
  }

  @ApiOperation({ summary: 'Customer reviews a product from a delivered order' })
  @ApiBearerAuth()
  @Post()
  create(@Req() request: Request, @Body() dto: CreateReviewDto) {
    return this.reviewService.create((request.user as AuthUser).userId, dto);
  }

  @ApiOperation({ summary: 'Admin lists reviews (filters, pagination)' })
  @ApiBearerAuth()
  @IsAdmin()
  @Get('admin')
  findAllForAdmin(@Query() dto: AdminFindReviewsDto) {
    return this.reviewService.findAllForAdmin(dto);
  }

  @ApiOperation({ summary: 'Admin hides or shows a review' })
  @ApiBearerAuth()
  @IsAdmin()
  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewStatusDto) {
    return this.reviewService.setStatus(id, dto.status);
  }

  @ApiOperation({ summary: 'Admin answers a review' })
  @ApiBearerAuth()
  @IsAdmin()
  @Patch(':id/reply')
  reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReplyDto) {
    return this.reviewService.reply(id, dto.reply);
  }

  @ApiOperation({ summary: 'Customer edits their review' })
  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update((request.user as AuthUser).userId, id, dto);
  }

  @ApiOperation({ summary: 'Customer deletes their review' })
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.remove((request.user as AuthUser).userId, id);
  }
}
