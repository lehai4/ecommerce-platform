import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AccessJwtAuthGuard } from './auth/access-jwt-auth.guard';
import { UserModule } from './models/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './models/product/product.module';
import { CategoryModule } from './models/category/category.module';
import { PurchaseModule } from './models/purchase/purchase.module';
import { OrderModule } from './models/order/order.module';
import { StockModule } from './models/stock/stock.module';
import { StatsModule } from './models/stats/stats.module';
import { CustomerModule } from './models/customer/customer.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    UserModule,
    AuthModule,
    PrismaModule,
    ProductModule,
    CategoryModule,
    PurchaseModule,
    OrderModule,
    StockModule,
    StatsModule,
    CustomerModule,
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
