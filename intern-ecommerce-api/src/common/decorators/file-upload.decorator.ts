/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  applyDecorators,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { FileUploadDto } from 'src/models/product/dto/file-upload.dto';

/** Max image size: 3MB */
export const maxImageUploadSize = 3 * 1024 * 1024;

/** Files are kept in memory; ImageStorageService decides where they go. */
export const fileConfig = {
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  storage: memoryStorage(),
  limits: { fileSize: maxImageUploadSize },
};

/** Add all file upload decorators at once
 *
 * <br>Example: Upload product picture
 */
export function FileUpload(): <TFunction>(
  target: object | TFunction,
  propertyKey?: string | symbol,
) => void {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file', fileConfig)),
    ApiConsumes('multipart/form-data'),
    ApiBody({ type: FileUploadDto }),
  );
}

/** Upload several images at once in the "files" field (max 10) */
export function FilesUpload(): <TFunction>(
  target: object | TFunction,
  propertyKey?: string | symbol,
) => void {
  return applyDecorators(
    UseInterceptors(FilesInterceptor('files', 10, fileConfig)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string', format: 'binary' } },
        },
      },
    }),
  );
}
