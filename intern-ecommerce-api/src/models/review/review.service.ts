import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import {
  AdminFindReviewsDto,
  FindProductReviewsDto,
} from './dto/find-reviews.dto';

const productSelect = {
  select: { id: true, name: true, urlName: true, picture: true },
};

/** Only a first name is shown publicly, never the email */
const publicName = (name?: string | null) =>
  name?.trim() ? name.trim().split(/\s+/).slice(-1)[0] : 'Customer';

/** Product reviews: written by customers after delivery, moderated by admins */
@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer reviews a product from one of their delivered orders */
  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        userId,
        status: OrderStatus.DELIVERED,
        items: { some: { productId: dto.productId } },
      },
      select: { id: true },
    });
    if (!order) {
      throw new BadRequestException(
        'You can only review products from your delivered orders',
      );
    }
    const existing = await this.prisma.review.count({
      where: { orderId: dto.orderId, productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('You already reviewed this product for this order');
    }

    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        userId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      include: { product: productSelect },
    });
    await this.refreshProductRating(dto.productId);
    return review;
  }

  /** Customer edits their own review */
  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.findOwn(userId, id);
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        comment: dto.comment !== undefined ? dto.comment.trim() || null : undefined,
      },
      include: { product: productSelect },
    });
    await this.refreshProductRating(review.productId);
    return updated;
  }

  /** Customer deletes their own review */
  async remove(userId: string, id: string): Promise<void> {
    const review = await this.findOwn(userId, id);
    await this.prisma.review.delete({ where: { id } });
    await this.refreshProductRating(review.productId);
  }

  /** The customer's reviews, and the delivered products still waiting for one */
  async mine(userId: string) {
    const [reviews, delivered] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { product: productSelect, order: { select: { id: true, code: true } } },
      }),
      this.prisma.orderItem.findMany({
        where: {
          productId: { not: null },
          order: { userId, status: OrderStatus.DELIVERED },
        },
        select: {
          productId: true,
          productName: true,
          productPicture: true,
          order: { select: { id: true, code: true, updatedAt: true } },
        },
        orderBy: { order: { updatedAt: 'desc' } },
      }),
    ]);

    const done = new Set(reviews.map((r) => `${r.orderId}:${r.productId}`));
    const toReview = delivered
      .filter((item) => !done.has(`${item.order.id}:${item.productId}`))
      .map((item) => ({
        orderId: item.order.id,
        orderCode: item.order.code,
        deliveredAt: item.order.updatedAt,
        productId: item.productId,
        productName: item.productName,
        productPicture: item.productPicture,
      }));

    return { reviews, toReview };
  }

  /** Visible reviews of a product, with the rating summary */
  async findForProduct(productId: string, dto: FindProductReviewsDto) {
    const { rating, sort = 'newest', page = 1, offset = 10 } = dto;
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, ratingAverage: true, ratingCount: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const visible = { productId, status: ReviewStatus.VISIBLE };
    const where: Prisma.ReviewWhereInput = { ...visible, rating };
    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      sort === 'rating_desc'
        ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : sort === 'rating_asc'
        ? [{ rating: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const [total, rows, groups] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * offset,
        take: offset,
        select: {
          id: true,
          rating: true,
          comment: true,
          reply: true,
          repliedAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: visible,
        _count: { _all: true },
      }),
    ]);

    return {
      summary: {
        average: product.ratingAverage,
        count: product.ratingCount,
        distribution: [5, 4, 3, 2, 1].map((stars) => ({
          rating: stars,
          count: groups.find((g) => g.rating === stars)?._count._all ?? 0,
        })),
      },
      data: rows.map(({ user, ...r }) => ({ ...r, author: publicName(user?.name) })),
      total,
      page,
      offset,
    };
  }

  /** All reviews for admins */
  async findAllForAdmin(dto: AdminFindReviewsDto) {
    const { status, rating, productId, search, replied, page = 1, offset = 20 } = dto;
    const term = search?.trim();
    const where: Prisma.ReviewWhereInput = {
      status,
      rating,
      productId,
      reply: replied === 'yes' ? { not: null } : replied === 'no' ? null : undefined,
      ...(term && {
        OR: [
          { comment: { contains: term, mode: 'insensitive' } },
          { product: { name: { contains: term, mode: 'insensitive' } } },
          { user: { email: { contains: term, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * offset,
        take: offset,
        include: {
          product: productSelect,
          user: { select: { id: true, email: true, name: true } },
          order: { select: { id: true, code: true } },
        },
      }),
    ]);
    return { data, total, page, offset };
  }

  /** Admin hides or shows a review */
  async setStatus(id: string, status: ReviewStatus) {
    const review = await this.findOrFail(id);
    const updated = await this.prisma.review.update({
      where: { id },
      data: { status },
    });
    await this.refreshProductRating(review.productId);
    return updated;
  }

  /** Admin answers a review (empty removes the answer) */
  async reply(id: string, reply?: string | null) {
    await this.findOrFail(id);
    const text = reply?.trim() || null;
    return this.prisma.review.update({
      where: { id },
      data: { reply: text, repliedAt: text ? new Date() : null },
    });
  }

  /** Recomputes the product's average from its visible reviews */
  private async refreshProductRating(productId: string): Promise<void> {
    const stats = await this.prisma.review.aggregate({
      where: { productId, status: ReviewStatus.VISIBLE },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        ratingCount: stats._count._all,
      },
    });
  }

  private async findOwn(userId: string, id: string) {
    const review = await this.prisma.review.findFirst({ where: { id, userId } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private async findOrFail(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}
