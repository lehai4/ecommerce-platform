import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { File } from 'src/models/product/types/file';
import createFileStorageUrl from 'src/util/createFileStorageUrl';
import { v4 as uuid } from 'uuid';

/** Stores uploaded images.
 *
 * Uses Cloudinary when the `CLOUDINARY_URL` env variable is set
 * (format: `cloudinary://<api_key>:<api_secret>@<cloud_name>`),
 * otherwise falls back to the local `storage/` folder served by the API.
 */
@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly useCloudinary = !!process.env.CLOUDINARY_URL;
  private readonly baseFolder = process.env.CLOUDINARY_FOLDER || 'cms';

  constructor() {
    if (this.useCloudinary) {
      // The SDK reads CLOUDINARY_URL from the environment.
      cloudinary.config({ secure: true });
      this.logger.log('Images are stored on Cloudinary');
    } else {
      this.logger.warn(
        'CLOUDINARY_URL is not set, images are stored in the local storage/ folder',
      );
    }
  }

  /** Saves the image and returns the URL to put in the database */
  async upload(file: File, folder: string): Promise<string> {
    if (this.useCloudinary) {
      return this.uploadToCloudinary(file, folder);
    }
    return this.saveLocally(file);
  }

  private uploadToCloudinary(file: File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.baseFolder}/${folder}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message}`);
            return reject(
              new BadGatewayException(
                `Image upload failed: ${error?.message ?? 'unknown error'}`,
              ),
            );
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  private saveLocally(file: File): string {
    const dir = 'storage';
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    const name = `${uuid()}${extname(file.originalname).toLowerCase()}`;
    writeFileSync(join(dir, name), file.buffer);
    return createFileStorageUrl(name);
  }
}
