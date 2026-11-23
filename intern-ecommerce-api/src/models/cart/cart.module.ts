import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  imports: [PrismaModule, JwtModule.register({})],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
