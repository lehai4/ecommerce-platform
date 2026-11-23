import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/auth/public.decorator';
import { accessJwtConfig } from 'src/config/jwt.config';
import { CartOwner, CartService } from './cart.service';
import {
  AddCartItemDto,
  MergeCartDto,
  SetCartQuantityDto,
} from './dto/cart-item.dto';

const CART_TOKEN = 'x-cart-token';

/**
 * Shopping cart for signed-in users and guests.
 *
 * Every route is public: a valid Bearer token selects the user's cart,
 * otherwise the guest cart from the X-Cart-Token header is used (and created
 * on the first add; its token is returned in the response).
 */
@ApiTags('cart')
@ApiHeader({ name: 'X-Cart-Token', required: false, description: 'Guest cart token' })
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({ summary: 'Current cart with prices, totals and warnings' })
  @Public()
  @Get()
  async get(@Req() req: Request, @Headers(CART_TOKEN) token?: string) {
    return this.cartService.get(await this.owner(req, token));
  }

  @ApiOperation({ summary: 'Adds a product to the cart' })
  @Public()
  @Post('items')
  async add(
    @Req() req: Request,
    @Body() dto: AddCartItemDto,
    @Headers(CART_TOKEN) token?: string,
  ) {
    return this.cartService.addItem(await this.owner(req, token), dto.productId, dto.quantity);
  }

  @ApiOperation({ summary: 'Sets the quantity of a product (0 removes it)' })
  @Public()
  @Patch('items/:productId')
  async setQuantity(
    @Req() req: Request,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetCartQuantityDto,
    @Headers(CART_TOKEN) token?: string,
  ) {
    return this.cartService.setQuantity(await this.owner(req, token), productId, dto.quantity);
  }

  @ApiOperation({ summary: 'Removes a product from the cart' })
  @Public()
  @Delete('items/:productId')
  async remove(
    @Req() req: Request,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Headers(CART_TOKEN) token?: string,
  ) {
    return this.cartService.removeItem(await this.owner(req, token), productId);
  }

  @ApiOperation({ summary: 'Empties the cart' })
  @Public()
  @Delete()
  async clear(@Req() req: Request, @Headers(CART_TOKEN) token?: string) {
    return this.cartService.clear(await this.owner(req, token));
  }

  @ApiOperation({ summary: 'Accepts the current prices (removes price-change warnings)' })
  @Public()
  @Post('accept-prices')
  async acceptPrices(@Req() req: Request, @Headers(CART_TOKEN) token?: string) {
    return this.cartService.acceptPrices(await this.owner(req, token));
  }

  @ApiOperation({ summary: 'After sign in: moves the guest cart into the user cart' })
  @Public()
  @Post('merge')
  async merge(@Req() req: Request, @Body() dto: MergeCartDto) {
    const { userId } = await this.owner(req);
    if (!userId) throw new UnauthorizedException('Sign in to merge your cart');
    return this.cartService.merge(userId, dto.guestToken);
  }

  /** Signed-in user if a valid token is sent, else the guest token */
  private async owner(req: Request, guestToken?: string): Promise<CartOwner> {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          header.slice('Bearer '.length),
          { secret: accessJwtConfig.secret as string },
        );
        return { userId: payload.sub };
      } catch {
        // Expired/invalid session: let the client refresh instead of silently using a guest cart
        throw new UnauthorizedException();
      }
    }
    return { guestToken: guestToken?.trim() || undefined };
  }
}
