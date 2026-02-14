import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Seed Languages
  console.log('🌍 Seeding languages...');
  const languages = [
    { code: 'en', name: 'English', isDefault: true, isActive: true },
    { code: 'ro', name: 'Romanian', isDefault: false, isActive: true },
    { code: 'ru', name: 'Russian', isDefault: false, isActive: true },
    { code: 'de', name: 'German', isDefault: false, isActive: true },
    { code: 'tr', name: 'Turkish', isDefault: false, isActive: true },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`✅ Seeded ${languages.length} languages`);

  // Seed UI Translations (English)
  console.log('📝 Seeding UI translations...');
  const uiTranslations = [
    { key: 'header.menu.home', language: 'en', value: 'Home' },
    { key: 'header.menu.products', language: 'en', value: 'Products' },
    { key: 'header.menu.categories', language: 'en', value: 'Categories' },
    { key: 'header.menu.brands', language: 'en', value: 'Brands' },
    { key: 'header.menu.cart', language: 'en', value: 'Cart' },
    { key: 'header.menu.dashboard', language: 'en', value: 'Dashboard' },
    { key: 'header.menu.newProduct', language: 'en', value: 'New Product' },
    { key: 'header.actions.login', language: 'en', value: 'Login' },
    { key: 'header.actions.logout', language: 'en', value: 'Logout' },
    { key: 'header.actions.profile', language: 'en', value: 'Profile' },
    { key: 'footer.shop.title', language: 'en', value: 'Shop' },
    { key: 'footer.shop.allProducts', language: 'en', value: 'All Products' },
    { key: 'footer.shop.categories', language: 'en', value: 'Categories' },
    { key: 'footer.shop.brands', language: 'en', value: 'Brands' },
    { key: 'footer.customerService.title', language: 'en', value: 'Customer Service' },
    { key: 'footer.customerService.contact', language: 'en', value: 'Contact Us' },
    { key: 'footer.customerService.shipping', language: 'en', value: 'Shipping Info' },
    { key: 'footer.customerService.returns', language: 'en', value: 'Returns' },
    { key: 'products.title', language: 'en', value: 'Products' },
    { key: 'products.noProducts', language: 'en', value: 'No products found' },
    { key: 'products.addToCart', language: 'en', value: 'Add to Cart' },
    { key: 'products.outOfStock', language: 'en', value: 'Out of Stock' },
    { key: 'products.inStock', language: 'en', value: 'In Stock' },
    { key: 'products.price', language: 'en', value: 'Price' },
    { key: 'products.viewDetails', language: 'en', value: 'View Details' },
    { key: 'cart.title', language: 'en', value: 'Shopping Cart' },
    { key: 'cart.empty', language: 'en', value: 'Your cart is empty' },
    { key: 'cart.total', language: 'en', value: 'Total' },
    { key: 'cart.checkout', language: 'en', value: 'Checkout' },
    { key: 'cart.remove', language: 'en', value: 'Remove' },
    { key: 'cart.quantity', language: 'en', value: 'Quantity' },
    { key: 'common.loading', language: 'en', value: 'Loading...' },
    { key: 'common.error', language: 'en', value: 'An error occurred' },
    { key: 'common.save', language: 'en', value: 'Save' },
    { key: 'common.cancel', language: 'en', value: 'Cancel' },
    { key: 'common.delete', language: 'en', value: 'Delete' },
    { key: 'common.edit', language: 'en', value: 'Edit' },
    { key: 'common.create', language: 'en', value: 'Create' },
    { key: 'common.update', language: 'en', value: 'Update' },
    { key: 'common.search', language: 'en', value: 'Search' },
    { key: 'common.filter', language: 'en', value: 'Filter' },
    { key: 'common.clear', language: 'en', value: 'Clear' },
  ];

  for (const translation of uiTranslations) {
    await prisma.uiTranslation.upsert({
      where: {
        key_language: {
          key: translation.key,
          language: translation.language,
        },
      },
      update: { value: translation.value },
      create: translation,
    });
  }
  console.log(`✅ Seeded ${uiTranslations.length} UI translations`);

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

  // Seed Regions, Tax Rates, and Shipping
  const germany = await prisma.region.upsert({
    where: { code: 'DE' },
    update: {
      name: 'Germany',
      currency: 'EUR',
      isDefault: true,
      isActive: true,
    },
    create: {
      code: 'DE',
      name: 'Germany',
      currency: 'EUR',
      isDefault: true,
      isActive: true,
    },
  });

  const defaultTaxRate = await prisma.taxRate.findFirst({
    where: { regionId: germany.id, isDefault: true },
  });

  if (defaultTaxRate) {
    await prisma.taxRate.update({
      where: { id: defaultTaxRate.id },
      data: {
        name: 'VAT 19%',
        rate: 0.19,
        isDefault: true,
        isActive: true,
      },
    });
  } else {
    await prisma.taxRate.create({
      data: {
        regionId: germany.id,
        name: 'VAT 19%',
        rate: 0.19,
        isDefault: true,
        isActive: true,
      },
    });
  }

  const standardMethod = await prisma.shippingMethod.upsert({
    where: { regionId_code: { regionId: germany.id, code: 'standard' } },
    update: {
      name: 'Standard Delivery',
      carrier: 'DHL',
      isExpress: false,
      isActive: true,
    },
    create: {
      regionId: germany.id,
      code: 'standard',
      name: 'Standard Delivery',
      carrier: 'DHL',
      isExpress: false,
      isActive: true,
    },
  });

  const expressMethod = await prisma.shippingMethod.upsert({
    where: { regionId_code: { regionId: germany.id, code: 'dhl_express' } },
    update: {
      name: 'DHL Express',
      carrier: 'DHL',
      isExpress: true,
      isActive: true,
    },
    create: {
      regionId: germany.id,
      code: 'dhl_express',
      name: 'DHL Express',
      carrier: 'DHL',
      isExpress: true,
      isActive: true,
    },
  });

  await prisma.shippingRule.deleteMany({
    where: { shippingMethodId: { in: [standardMethod.id, expressMethod.id] } },
  });

  await prisma.shippingRule.createMany({
    data: [
      {
        shippingMethodId: standardMethod.id,
        minSubtotal: 0,
        maxSubtotal: 99.99,
        price: 4.99,
        isActive: true,
      },
      {
        shippingMethodId: standardMethod.id,
        minSubtotal: 100,
        maxSubtotal: null,
        price: 0,
        isActive: true,
      },
      {
        shippingMethodId: expressMethod.id,
        minSubtotal: 0,
        maxSubtotal: null,
        price: 14.99,
        isActive: true,
      },
    ],
  });

  // Create Attributes
  const volumeAttr = await prisma.attribute.upsert({
    where: { slug: 'volume' },
    update: {},
    create: {
      name: 'Volume',
      slug: 'volume',
    },
  });

  const genderAttr = await prisma.attribute.upsert({
    where: { slug: 'gender' },
    update: {},
    create: {
      name: 'Gender',
      slug: 'gender',
    },
  });

  const concentrationAttr = await prisma.attribute.upsert({
    where: { slug: 'concentration' },
    update: {},
    create: {
      name: 'Concentration',
      slug: 'concentration',
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

  // Get or create default product type (required by Product model)
  let defaultProductType = await prisma.productType.findFirst({
    where: { slug: 'default' },
  });
  if (!defaultProductType) {
    defaultProductType = await prisma.productType.create({
      data: {
        name: 'Default',
        slug: 'default',
        description: 'Default product type',
      },
    });
  }

  // Create Products
  const products = [
    {
      name: 'Elegance Classic',
      slug: 'elegance-classic',
      description: 'A timeless classic fragrance with notes of bergamot, jasmine, and sandalwood. Perfect for any occasion.',
      shortDescription: 'Timeless classic fragrance',
      sku: 'ELG-CLS-001',
      brandId: createdBrands[0].id,
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
        productTypeId: defaultProductType.id,
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
      const existing = await prisma.productAttribute.findFirst({
        where: {
          productId: product.id,
          attributeId: attr.attributeId,
        },
      });

      if (existing) {
        await prisma.productAttribute.update({
          where: { id: existing.id },
          data: { value: attr.value },
        });
      } else {
        await prisma.productAttribute.create({
          data: {
            productId: product.id,
            attributeId: attr.attributeId,
            value: attr.value,
          },
        });
      }
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

