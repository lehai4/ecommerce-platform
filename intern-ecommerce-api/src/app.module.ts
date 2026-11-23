import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AccessJwtAuthGuard } from './auth/access-jwt-auth.guard';
import { UserModule } from './models/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './models/product/product.module';
import { CategoryModule } from './models/category/category.module';
import { OrderModule } from './models/order/order.module';
import { StockModule } from './models/stock/stock.module';
import { StatsModule } from './models/stats/stats.module';
import { CustomerModule } from './models/customer/customer.module';
import { ReviewModule } from './models/review/review.module';
import { CartModule } from './models/cart/cart.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    UserModule,
    AuthModule,
    PrismaModule,
    ProductModule,
    CategoryModule,
    OrderModule,
    StockModule,
    StatsModule,
    CustomerModule,
    ReviewModule,
    CartModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'storage'),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessJwtAuthGuard,
    },
  ],
})
export class AppModule {}
