import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ImageStorageService } from 'src/common/image-storage/image-storage.service';

@Module({
  controllers: [CategoryController],
  imports: [PrismaModule],
  providers: [CategoryService, ImageStorageService],
})
export class CategoryModule {}
