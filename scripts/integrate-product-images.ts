import { prisma } from '../src/lib/prisma';
import { DEFAULT_SHOP_ID } from '../src/lib/apiHelper';

interface ProductImageMapping {
  id: string;
  sku: string;
  name: string;
  brand: string;
  categorySlug: string;
  imageUrl: string;
}

const PRODUCT_IMAGE_MAPPINGS: ProductImageMapping[] = [
  {
    id: 'prod-07',
    sku: 'CBL-OTG-3IN1',
    name: 'Joyroom 3-in-1 Fast Charging Cable (Type-C / Lightning / Micro)',
    brand: 'Joyroom',
    categorySlug: 'cables-interconnects',
    imageUrl: '/images/products/joyroom-3-in-1-cable.webp',
  },
  {
    id: 'prod-20',
    sku: 'ACC-CAR-MNT',
    name: 'Baseus 360° Magnetic Air Vent Car Phone Mount',
    brand: 'Baseus',
    categorySlug: 'protection-cases',
    imageUrl: '/images/products/baseus-car-phone-mount.webp',
  },
  {
    id: 'prod-09',
    sku: 'AUD-ANK-P20I',
    name: 'Soundcore by Anker P20i True Wireless Earbuds',
    brand: 'Anker',
    categorySlug: 'audio-earbuds',
    imageUrl: '/images/products/soundcore-p20i-earbuds.webp',
  },
  {
    id: 'prod-19',
    sku: 'PRT-MAG-CASE-IP15',
    name: 'Baseus Magnetic Crystal Clear Case for iPhone 15 Pro Max',
    brand: 'Baseus',
    categorySlug: 'protection-cases',
    imageUrl: '/images/products/baseus-iphone-15-pro-max-case.webp',
  },
  {
    id: 'prod-04',
    sku: 'CHG-LDN32W',
    name: 'LDNIO 32W Dual QC3.0 Fast Car Charger with LED',
    brand: 'LDNIO',
    categorySlug: 'chargers-power',
    imageUrl: '/images/products/ldnio-32w-car-charger.webp',
  },
  {
    id: 'prod-18',
    sku: 'PRT-SAM-S24U-PV',
    name: 'Samsung Galaxy S24 Ultra Privacy Anti-Spy Screen Glass',
    brand: 'Joyroom',
    categorySlug: 'protection-cases',
    imageUrl: '/images/products/samsung-s24-ultra-privacy-glass.webp',
  },
  {
    id: 'prod-13',
    sku: 'PWR-ORA-10K-MAG',
    name: 'Oraimo MagCharge 10000mAh Magnetic Wireless Power Bank',
    brand: 'Oraimo',
    categorySlug: 'powerbanks-batteries',
    imageUrl: '/images/products/oraimo-magcharge-10000mah.webp',
  },
  {
    id: 'prod-02',
    sku: 'CHG-SAM45W',
    name: 'Samsung 45W Super Fast Type-C Adapter EP-T4510',
    brand: 'Samsung',
    categorySlug: 'chargers-power',
    imageUrl: '/images/products/samsung-ep-t4510-45w.webp',
  },
  {
    id: 'prod-10',
    sku: 'AUD-SNY-CH520',
    name: 'Sony WH-CH520 Wireless Bluetooth Headphones',
    brand: 'Sony',
    categorySlug: 'audio-earbuds',
    imageUrl: '/images/products/sony-wh-ch520-headphones.webp',
  },
  {
    id: 'prod-05',
    sku: 'CBL-BAS100W',
    name: 'Baseus Cafule 100W 2M Nylon Braided Type-C to Type-C',
    brand: 'Baseus',
    categorySlug: 'cables-interconnects',
    imageUrl: '/images/products/baseus-cafule-100w-2m.webp',
  },
];

async function main() {
  console.log('🔄 Integrating real product images into PostgreSQL database...');

  // Get categories map
  const categories = await prisma.category.findMany({
    where: { shopId: DEFAULT_SHOP_ID },
  });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const item of PRODUCT_IMAGE_MAPPINGS) {
    const categoryId = catBySlug.get(item.categorySlug) || categories[0].id;

    // Check if product exists by SKU or by ID
    let product = await prisma.product.findFirst({
      where: {
        shopId: DEFAULT_SHOP_ID,
        OR: [{ id: item.id }, { sku: item.sku }],
      },
    });

    if (product) {
      // Update imageUrl and ensure alignment
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: {
          sku: item.sku,
          name: item.name,
          brand: item.brand,
          categoryId,
          imageUrl: item.imageUrl,
        },
      });
      console.log(`✓ Updated [${updated.id}] ${updated.sku} -> ${updated.imageUrl}`);
    } else {
      // Create if missing
      const created = await prisma.product.create({
        data: {
          id: item.id,
          shopId: DEFAULT_SHOP_ID,
          sku: item.sku,
          name: item.name,
          brand: item.brand,
          categoryId,
          sellingPrice: 1000,
          averageCost: 600,
          onHand: 15,
          reorderLevel: 5,
          imageUrl: item.imageUrl,
          status: 'active',
        },
      });
      console.log(`✓ Created [${created.id}] ${created.sku} -> ${created.imageUrl}`);
    }
  }

  console.log('\n🎉 ALL 10 PRODUCT IMAGES INTEGRATED INTO DATABASE SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('Integration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
