import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Create a simple placeholder image (1x1 pixel PNG)
function createPlaceholderImage(): Buffer {
  // Base64 encoded 1x1 transparent PNG
  const base64Image =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64Image, 'base64');
}

// Create a colored placeholder image
function createColoredPlaceholder(color: string): Buffer {
  // For now, we'll use the same transparent PNG
  // In production, you could generate actual colored images
  return createPlaceholderImage();
}

async function seedImages() {
  console.log('🖼️  Starting image seeding...');

  // Initialize MinIO client
  const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });

  const bucketName = process.env.MINIO_BUCKET || 'products';

  // Ensure bucket exists
  const bucketExists = await minioClient.bucketExists(bucketName);
  if (!bucketExists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(`✅ Created bucket: ${bucketName}`);
  }

  // Get all products
  const products = await prisma.product.findMany({
    include: {
      brand: true,
      categories: {
        include: {
          category: true,
        },
        take: 1,
      },
    },
  });

  console.log(`📦 Found ${products.length} products to seed images for`);

  // Image colors for different products (for visual variety)
  const imageColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
  ];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const color = imageColors[i % imageColors.length];

    // Get category and brand slugs for path
    const categorySlug = product.categories[0]?.category?.slug || 'uncategorized';
    const brandSlug = product.brand.slug;

    // Check if product already has images
    const existingImages = await prisma.productImage.findMany({
      where: { productId: product.id },
    });

    if (existingImages.length > 0) {
      console.log(`⏭️  Product "${product.name}" already has images, skipping...`);
      continue;
    }

    // Create 2-3 placeholder images per product
    const imageCount = Math.min(3, Math.floor(Math.random() * 2) + 2); // 2 or 3 images

    for (let imgIndex = 0; imgIndex < imageCount; imgIndex++) {
      const imageId = uuidv4();
      const fileExtension = '.png';
      const filename = `${imageId}${fileExtension}`;
      const filepath = `products/${categorySlug}/${brandSlug}/${product.id}/${filename}`;

      // Create placeholder image
      const imageBuffer = createColoredPlaceholder(color);

      try {
        // Upload to MinIO
        await minioClient.putObject(bucketName, filepath, imageBuffer, imageBuffer.length, {
          'Content-Type': 'image/png',
        });

        // Create database record
        await prisma.productImage.create({
          data: {
            productId: product.id,
            bucket: bucketName,
            filepath: filepath,
            filename: filename,
            size: imageBuffer.length,
            mimeType: 'image/png',
            isPrimary: imgIndex === 0,
            order: imgIndex,
          },
        });

        console.log(`  ✅ Created image ${imgIndex + 1}/${imageCount} for "${product.name}"`);
      } catch (error) {
        console.error(`  ❌ Failed to create image for "${product.name}":`, error);
      }
    }
  }

  console.log('✅ Image seeding completed!');
}

seedImages()
  .catch((e) => {
    console.error('❌ Image seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


