import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    brand: true,
                    productImages: {
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          items: {
            create: [],
          },
        },
        include: {
          items: {
            include: {
              productVariant: {
                include: {
                  product: {
                    include: {
                      brand: true,
                      productImages: {
                        where: { isPrimary: true },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Transform to match frontend format
    const bucket = this.storageService.getBucketName();
    return {
      items: cart.items.map((item) => {
        let imageUrl: string | undefined;
        
        // Prefer productImages over legacy images
        if (item.productVariant.product.productImages?.[0]?.filepath) {
          imageUrl = this.storageService.getPublicUrl(
            bucket,
            item.productVariant.product.productImages[0].filepath,
          );
        } else if (item.productVariant.product.images?.[0]) {
          // Handle legacy images
          const legacyImage = item.productVariant.product.images[0];
          if (legacyImage.startsWith('http://') || legacyImage.startsWith('https://')) {
            imageUrl = legacyImage;
          } else {
            imageUrl = this.storageService.getPublicUrl(bucket, legacyImage);
          }
        }
        
        return {
          id: item.productVariant.id,
          productId: item.productVariant.product.id,
          productName: item.productVariant.product.name,
          productSlug: item.productVariant.product.slug,
          variantName: item.productVariant.name || 'Standard',
          price: item.productVariant.price,
          quantity: item.quantity,
          stock: item.productVariant.stock,
          image: imageUrl,
        };
      }),
    };
  }

  async updateCart(userId: string, updateCartDto: UpdateCartDto) {
    // Verify all variants exist and get their data
    const variants = await Promise.all(
      updateCartDto.items.map(async (item) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: {
              include: {
                brand: true,
                productImages: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        });
        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found`);
        }
        if (item.quantity > variant.stock) {
          throw new Error(
            `Insufficient stock for variant ${item.variantId}. Available: ${variant.stock}`,
          );
        }
        return { variant, quantity: item.quantity };
      }),
    );

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Delete all existing items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Create new items
    await this.prisma.cartItem.createMany({
      data: variants.map((v) => ({
        cartId: cart.id,
        productVariantId: v.variant.id,
        quantity: v.quantity,
      })),
    });

    // Return updated cart
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { items: [] };
  }
}

