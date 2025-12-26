import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    },
  });

  // Create Product Type: Perfume
  const perfumeType = await prisma.productType.upsert({
    where: { slug: 'perfume' },
    update: {},
    create: {
      name: 'Perfume',
      slug: 'perfume',
      description: 'Fragrance products',
    },
  });

  // Create Attributes for Perfume
  const volumeAttr = await prisma.attribute.upsert({
    where: {
      slug_productTypeId: {
        slug: 'volume',
        productTypeId: perfumeType.id,
      },
    },
    update: {},
    create: {
      name: 'Volume',
      slug: 'volume',
      productTypeId: perfumeType.id,
    },
  });

  const genderAttr = await prisma.attribute.upsert({
    where: {
      slug_productTypeId: {
        slug: 'gender',
        productTypeId: perfumeType.id,
      },
    },
    update: {},
    create: {
      name: 'Gender',
      slug: 'gender',
      productTypeId: perfumeType.id,
    },
  });

  const concentrationAttr = await prisma.attribute.upsert({
    where: {
      slug_productTypeId: {
        slug: 'concentration',
        productTypeId: perfumeType.id,
      },
    },
    update: {},
    create: {
      name: 'Concentration',
      slug: 'concentration',
      productTypeId: perfumeType.id,
    },
  });

  // Create Brands
  const brands = [
    {
      name: 'Elegance',
      slug: 'elegance',
      description: 'Premium luxury fragrances',
    },
    {
      name: 'Aurora',
      slug: 'aurora',
      description: 'Modern and fresh scents',
    },
    {
      name: 'Noir',
      slug: 'noir',
      description: 'Bold and mysterious fragrances',
    },
  ];

  const createdBrands = [];
  for (const brand of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    });
    createdBrands.push(created);
  }

  // Create Categories (hierarchical)
  const fragranceCategory = await prisma.category.upsert({
    where: { slug: 'fragrances' },
    update: {},
    create: {
      name: 'Fragrances',
      slug: 'fragrances',
      description: 'All fragrance products',
    },
  });

  const menCategory = await prisma.category.upsert({
    where: { slug: 'men' },
    update: {},
    create: {
      name: 'Men',
      slug: 'men',
      description: 'Men\'s fragrances',
      parentId: fragranceCategory.id,
    },
  });

  const womenCategory = await prisma.category.upsert({
    where: { slug: 'women' },
    update: {},
    create: {
      name: 'Women',
      slug: 'women',
      description: 'Women\'s fragrances',
      parentId: fragranceCategory.id,
    },
  });

  const unisexCategory = await prisma.category.upsert({
    where: { slug: 'unisex' },
    update: {},
    create: {
      name: 'Unisex',
      slug: 'unisex',
      description: 'Unisex fragrances',
      parentId: fragranceCategory.id,
    },
  });

  // Create Products
  const products = [
    {
      name: 'Elegance Classic',
      slug: 'elegance-classic',
      description: 'A timeless classic fragrance with notes of bergamot, jasmine, and sandalwood. Perfect for any occasion.',
      shortDescription: 'Timeless classic fragrance',
      sku: 'ELG-CLS-001',
      brandId: createdBrands[0].id,
      productTypeId: perfumeType.id,
      images: ['/images/products/elegance-classic-1.jpg'],
      isFeatured: true,
      metaTitle: 'Elegance Classic Perfume',
      metaDescription: 'Discover Elegance Classic - a timeless fragrance with notes of bergamot, jasmine, and sandalwood.',
      categories: [womenCategory.id],
      attributes: [
        { attributeId: genderAttr.id, value: 'Women' },
        { attributeId: concentrationAttr.id, value: 'Eau de Parfum' },
      ],
      variants: [
        { name: '50ml', sku: 'ELG-CLS-001-50', price: 89.99, stock: 50 },
        { name: '100ml', sku: 'ELG-CLS-001-100', price: 149.99, stock: 30 },
      ],
    },
    {
      name: 'Aurora Fresh',
      slug: 'aurora-fresh',
      description: 'A vibrant and fresh fragrance with citrus top notes, floral heart, and woody base. Energizing and modern.',
      shortDescription: 'Vibrant and fresh fragrance',
      sku: 'AUR-FRS-001',
      brandId: createdBrands[1].id,
      productTypeId: perfumeType.id,
      images: ['/images/products/aurora-fresh-1.jpg'],
      isFeatured: true,
      metaTitle: 'Aurora Fresh Perfume',
      metaDescription: 'Experience Aurora Fresh - a vibrant fragrance with citrus and floral notes.',
      categories: [unisexCategory.id],
      attributes: [
        { attributeId: genderAttr.id, value: 'Unisex' },
        { attributeId: concentrationAttr.id, value: 'Eau de Toilette' },
      ],
      variants: [
        { name: '50ml', sku: 'AUR-FRS-001-50', price: 79.99, stock: 40 },
        { name: '100ml', sku: 'AUR-FRS-001-100', price: 129.99, stock: 25 },
        { name: '200ml', sku: 'AUR-FRS-001-200', price: 199.99, stock: 15 },
      ],
    },
    {
      name: 'Noir Mystique',
      slug: 'noir-mystique',
      description: 'A bold and mysterious fragrance with dark notes of black pepper, oud, and vanilla. For the confident individual.',
      shortDescription: 'Bold and mysterious fragrance',
      sku: 'NOR-MYS-001',
      brandId: createdBrands[2].id,
      productTypeId: perfumeType.id,
      images: ['/images/products/noir-mystique-1.jpg'],
      isFeatured: true,
      metaTitle: 'Noir Mystique Perfume',
      metaDescription: 'Explore Noir Mystique - a bold fragrance with dark notes of black pepper, oud, and vanilla.',
      categories: [menCategory.id],
      attributes: [
        { attributeId: genderAttr.id, value: 'Men' },
        { attributeId: concentrationAttr.id, value: 'Eau de Parfum' },
      ],
      variants: [
        { name: '50ml', sku: 'NOR-MYS-001-50', price: 99.99, stock: 35 },
        { name: '100ml', sku: 'NOR-MYS-001-100', price: 169.99, stock: 20 },
      ],
    },
    {
      name: 'Elegance Rose',
      slug: 'elegance-rose',
      description: 'A delicate floral fragrance featuring rose, peony, and musk. Elegant and feminine.',
      shortDescription: 'Delicate floral fragrance',
      sku: 'ELG-ROS-001',
      brandId: createdBrands[0].id,
      productTypeId: perfumeType.id,
      images: ['/images/products/elegance-rose-1.jpg'],
      isFeatured: false,
      metaTitle: 'Elegance Rose Perfume',
      metaDescription: 'Discover Elegance Rose - a delicate floral fragrance with rose, peony, and musk.',
      categories: [womenCategory.id],
      attributes: [
        { attributeId: genderAttr.id, value: 'Women' },
        { attributeId: concentrationAttr.id, value: 'Eau de Parfum' },
      ],
      variants: [
        { name: '50ml', sku: 'ELG-ROS-001-50', price: 94.99, stock: 30 },
        { name: '100ml', sku: 'ELG-ROS-001-100', price: 159.99, stock: 18 },
      ],
    },
    {
      name: 'Aurora Sport',
      slug: 'aurora-sport',
      description: 'An energetic sport fragrance with fresh aquatic notes and a modern twist. Perfect for active lifestyles.',
      shortDescription: 'Energetic sport fragrance',
      sku: 'AUR-SPT-001',
      brandId: createdBrands[1].id,
      productTypeId: perfumeType.id,
      images: ['/images/products/aurora-sport-1.jpg'],
      isFeatured: false,
      metaTitle: 'Aurora Sport Perfume',
      metaDescription: 'Experience Aurora Sport - an energetic fragrance with fresh aquatic notes.',
      categories: [menCategory.id, unisexCategory.id],
      attributes: [
        { attributeId: genderAttr.id, value: 'Unisex' },
        { attributeId: concentrationAttr.id, value: 'Eau de Toilette' },
      ],
      variants: [
        { name: '75ml', sku: 'AUR-SPT-001-75', price: 69.99, stock: 45 },
        { name: '150ml', sku: 'AUR-SPT-001-150', price: 119.99, stock: 28 },
      ],
    },
  ];

  for (const productData of products) {
    const { categories, attributes, variants, ...productFields } = productData;

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productFields,
        variants: {
          create: variants,
        },
      },
    });

    // Link categories
    for (const categoryId of categories) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId: product.id,
            categoryId: categoryId,
          },
        },
        update: {},
        create: {
          productId: product.id,
          categoryId: categoryId,
        },
      });
    }

    // Link attributes
    for (const attr of attributes) {
      await prisma.productAttribute.upsert({
        where: {
          productId_attributeId: {
            productId: product.id,
            attributeId: attr.attributeId,
          },
        },
        update: { value: attr.value },
        create: {
          productId: product.id,
          attributeId: attr.attributeId,
          value: attr.value,
        },
      });
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('👤 Admin user: admin@example.com / admin123');
  console.log('👤 Test user: user@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

