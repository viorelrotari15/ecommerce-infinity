import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImagesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    options?: { isPrimary?: boolean; order?: number },
  ) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: {
          include: {
            products: {
              take: 1,
            },
          },
        },
        categories: {
          include: {
            category: true,
          },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Validate file
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Build file path: {category}/{brand}/{productId}/{filename}.jpg
    // Note: The bucket name is already "products", so we don't include it in the filepath
    const categorySlug = product.categories[0]?.category?.slug || 'uncategorized';
    const brandSlug = product.brand.slug;
    const fileExtension = path.extname(file.originalname) || '.jpg';
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filepath = `${categorySlug}/${brandSlug}/${productId}/${uniqueFilename}`;

    // Upload to MinIO
    const bucket = this.storageService.getBucketName();
    const metadata = await this.storageService.uploadFile({
      bucket,
      filepath,
      file: file.buffer,
      mimeType: file.mimetype,
    });

    // Check if this should be primary (first image or explicitly set)
    const existingImages = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    const isPrimary = options?.isPrimary ?? existingImages.length === 0;
    const order = options?.order ?? existingImages.length;

    // If setting as primary, unset other primary images
    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Save metadata to database
    const productImage = await this.prisma.productImage.create({
      data: {
        productId,
        bucket: metadata.bucket,
        filepath: metadata.filepath,
        filename: metadata.filename,
        size: metadata.size,
        mimeType: metadata.mimeType,
        isPrimary,
        order,
      },
    });

    return {
      ...productImage,
      url: this.storageService.getPublicUrl(bucket, filepath),
    };
  }

  async deleteProductImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    // Delete from MinIO
    await this.storageService.deleteFile(image.bucket, image.filepath);

    // Delete from database
    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { message: 'Image deleted successfully' };
  }

  async getProductImages(productId: string) {
    const images = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    const bucket = this.storageService.getBucketName();
    return images.map((image) => ({
      ...image,
      url: this.storageService.getPublicUrl(bucket, image.filepath),
    }));
  }

  async setPrimaryImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    // Unset all primary images for this product
    await this.prisma.productImage.updateMany({
      where: { productId: image.productId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set this image as primary
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return { message: 'Primary image updated successfully' };
  }

  async reorderImages(imageIds: string[]) {
    const updates = imageIds.map((id, index) =>
      this.prisma.productImage.update({
        where: { id },
        data: { order: index },
      }),
    );

    await Promise.all(updates);
    return { message: 'Images reordered successfully' };
  }
}
