import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { File } from 'src/models/product/types/file';
import createFileStorageUrl from 'src/util/createFileStorageUrl';
import { v4 as uuid } from 'uuid';

/** A stored image */
export interface StoredImage {
  /** URL to save in the database and show */
  url: string;
  /** Id used to delete the file later ("local:<file>" for local storage) */
  publicId: string;
}

const LOCAL_PREFIX = 'local:';
const LOCAL_DIR = 'storage';

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

  /** Saves the image and returns its URL and id */
  async upload(file: File, folder: string): Promise<StoredImage> {
    if (this.useCloudinary) {
      return this.uploadToCloudinary(file, folder);
    }
    return this.saveLocally(file);
  }

  /** Deletes a stored image. Never throws: a missing file must not block the caller. */
  async remove(publicId?: string | null): Promise<void> {
    if (!publicId) return;
    try {
      if (publicId.startsWith(LOCAL_PREFIX)) {
        const path = join(LOCAL_DIR, basename(publicId.slice(LOCAL_PREFIX.length)));
        if (existsSync(path)) unlinkSync(path);
        return;
      }
      if (this.useCloudinary) {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
    } catch (error) {
      this.logger.warn(`Could not delete image ${publicId}: ${error?.message}`);
    }
  }

  private uploadToCloudinary(file: File, folder: string): Promise<StoredImage> {
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
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  private saveLocally(file: File): StoredImage {
    if (!existsSync(LOCAL_DIR)) {
      mkdirSync(LOCAL_DIR);
    }
    const name = `${uuid()}${extname(file.originalname).toLowerCase()}`;
    writeFileSync(join(LOCAL_DIR, name), file.buffer);
    return { url: createFileStorageUrl(name), publicId: `${LOCAL_PREFIX}${name}` };
  }
}
