import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import currency from 'currency.js';
import { PrismaService } from 'src/prisma/prisma.service';
import { MAX_CART_QUANTITY } from './dto/cart-item.dto';

/** Who owns the cart: a signed-in user, or a guest with a token */
export interface CartOwner {
  userId?: string;
  guestToken?: string;
}

export type CartWarning =
  | { type: 'UNAVAILABLE' }
  | { type: 'OUT_OF_STOCK' }
  | { type: 'NOT_ENOUGH_STOCK'; available: number }
  | { type: 'PRICE_CHANGED'; previousPrice: number; currentPrice: number };

/** Warnings that prevent placing the order */
const BLOCKING = new Set(['UNAVAILABLE', 'OUT_OF_STOCK', 'NOT_ENOUGH_STOCK']);

const itemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      urlName: true,
      picture: true,
      sku: true,
      basePrice: true,
      discountPercentage: true,
      salePrice: true,
      stock: true,
      status: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.CartItemInclude;

type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: typeof itemInclude } };
}>;

/** Shopping carts kept on the server */
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current cart with prices, totals and warnings (an empty cart if none yet) */
  async get(owner: CartOwner) {
    const cart = await this.find(owner);
    return this.view(cart, owner);
  }

  /** Adds a product (or more of it) */
  async addItem(owner: CartOwner, productId: string, quantity: number) {
    const product = await this.sellableProduct(productId);
    const cart = await this.findOrCreate(owner);
    const existing = cart.items.find((i) => i.productId === productId);
    const total = Math.min((existing?.quantity ?? 0) + quantity, MAX_CART_QUANTITY);
    this.assertStock(product, total);

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: {
        cartId: cart.id,
        productId,
        quantity: total,
        priceWhenAdded: product.salePrice,
      },
      update: { quantity: total, priceWhenAdded: product.salePrice },
    });
    return this.get({ ...owner, guestToken: cart.guestToken ?? owner.guestToken });
  }

  /** Sets the quantity of a product; 0 removes it */
  async setQuantity(owner: CartOwner, productId: string, quantity: number) {
    const cart = await this.find(owner);
    const item = cart?.items.find((i) => i.productId === productId);
    if (!cart || !item) throw new NotFoundException('This product is not in the cart');

    if (quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      const product = await this.sellableProduct(productId);
      this.assertStock(product, quantity);
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity, priceWhenAdded: product.salePrice },
      });
    }
    return this.get(owner);
  }

  async removeItem(owner: CartOwner, productId: string) {
    const cart = await this.find(owner);
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    }
    return this.get(owner);
  }

  async clear(owner: CartOwner) {
    const cart = await this.find(owner);
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.get(owner);
  }

  /** The customer saw the new prices: stop warning about them */
  async acceptPrices(owner: CartOwner) {
    const cart = await this.find(owner);
    for (const item of cart?.items ?? []) {
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { priceWhenAdded: item.product.salePrice },
      });
    }
    return this.get(owner);
  }

  /** After sign in: moves the guest cart into the user's cart */
  async merge(userId: string, guestToken: string) {
    const guest = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (guest && guest.userId !== userId) {
      const cart = await this.findOrCreate({ userId });
      for (const item of guest.items) {
        const existing = cart.items.find((i) => i.productId === item.productId);
        const quantity = Math.min(
          (existing?.quantity ?? 0) + item.quantity,
          MAX_CART_QUANTITY,
        );
        await this.prisma.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
          create: {
            cartId: cart.id,
            productId: item.productId,
            quantity,
            priceWhenAdded: item.priceWhenAdded,
          },
          update: { quantity },
        });
      }
      await this.prisma.cart.delete({ where: { id: guest.id } });
    }
    return this.get({ userId });
  }

  /** Items to order for a signed-in user; refuses when something blocks the order */
  async checkoutItems(userId: string) {
    const view = await this.get({ userId });
    if (view.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }
    const blocked = view.items.filter((i) => i.warnings.some((w) => BLOCKING.has(w.type)));
    if (blocked.length) {
      throw new BadRequestException(
        `Please update your cart first: ${blocked.map((i) => i.name).join(', ')}`,
      );
    }
    return view.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  }

  async clearForUser(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
  }

  private async view(cart: CartWithItems | null, owner: CartOwner) {
    const items = (cart?.items ?? [])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => {
        const p = item.product;
        const unitPrice = Number(p.salePrice);
        const warnings: CartWarning[] = [];
        if (p.deletedAt || p.status !== ProductStatus.ACTIVE) {
          warnings.push({ type: 'UNAVAILABLE' });
        } else if (p.stock <= 0) {
          warnings.push({ type: 'OUT_OF_STOCK' });
        } else if (item.quantity > p.stock) {
          warnings.push({ type: 'NOT_ENOUGH_STOCK', available: p.stock });
        }
        const previousPrice = Number(item.priceWhenAdded);
        if (previousPrice !== unitPrice) {
          warnings.push({ type: 'PRICE_CHANGED', previousPrice, currentPrice: unitPrice });
        }
        return {
          productId: p.id,
          name: p.name,
          urlName: p.urlName,
          picture: p.picture,
          sku: p.sku,
          basePrice: Number(p.basePrice),
          discountPercentage: p.discountPercentage,
          unitPrice,
          quantity: item.quantity,
          stock: p.stock,
          lineTotal: currency(unitPrice).multiply(item.quantity).value,
          warnings,
        };
      });

    const payable = items.filter((i) => !i.warnings.some((w) => BLOCKING.has(w.type)));
    const subtotal = payable.reduce(
      (sum, i) => sum.add(currency(i.basePrice).multiply(i.quantity)),
      currency(0),
    );
    const total = payable.reduce((sum, i) => sum.add(i.lineTotal), currency(0));

    return {
      /** Guests must keep this token and send it back in X-Cart-Token */
      token: owner.userId ? null : cart?.guestToken ?? owner.guestToken ?? null,
      items,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: subtotal.value,
      discountTotal: subtotal.subtract(total).value,
      total: total.value,
      canCheckout: items.length > 0 && payable.length === items.length,
    };
  }

  private find(owner: CartOwner): Promise<CartWithItems | null> {
    const include = { items: { include: itemInclude } };
    if (owner.userId) {
      return this.prisma.cart.findUnique({ where: { userId: owner.userId }, include });
    }
    if (owner.guestToken) {
      return this.prisma.cart.findUnique({
        where: { guestToken: owner.guestToken },
        include,
      });
    }
    return Promise.resolve(null);
  }

  private async findOrCreate(owner: CartOwner): Promise<CartWithItems> {
    const existing = await this.find(owner);
    if (existing) return existing;
    return this.prisma.cart.create({
      data: owner.userId
        ? { userId: owner.userId }
        : { guestToken: randomBytes(24).toString('hex') },
      include: { items: { include: itemInclude } },
    });
  }

  private async sellableProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: ProductStatus.ACTIVE },
      select: { id: true, name: true, stock: true, salePrice: true },
    });
    if (!product) throw new NotFoundException('This product is not available');
    return product;
  }

  private assertStock(product: { name: string; stock: number }, quantity: number) {
    if (quantity > product.stock) {
      throw new BadRequestException(
        product.stock > 0
          ? `Only ${product.stock} "${product.name}" left in stock`
          : `"${product.name}" is out of stock`,
      );
    }
  }
}
