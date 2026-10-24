import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Nasir Amme Electronics database seed...');

  // 1. Primary Shop Record (Dire Dawa, Ethiopia)
  const shop = await prisma.shop.upsert({
    where: { id: 'shop-dire-dawa-01' },
    update: {},
    create: {
      id: 'shop-dire-dawa-01',
      name: 'Amme Business Center',
      legalName: 'Amme Business Center',
      tinNumber: '456567367897891380909',
      city: 'Dire Dawa',
      addressText: 'Kebele 02, Commercial District',
      countryCode: 'ET',
      currencyCode: 'ETB',
      timeZone: 'Africa/Addis_Ababa',
      phonePrimary: '+251 996656617',
      phoneSecondary: '+251786650163',
      email: 'info@amme-electronics.et',
      receiptHeader: 'Welcome to Amme Business Center• Dire Dawa\nQuality Electronics • Better Tomorrow',
      receiptFooter: 'Thank you for shopping with us!\nExchange within 3 days with valid receipt.\nWarranty terms apply to electronics with manufacturer seals.',
      taxRate: new Prisma.Decimal(0.0),
      isTaxEnabled: false,
      lowStockGlobalThreshold: 8,
    },
  });
  console.log(`✓ Shop configured: ${shop.name} (${shop.id})`);

  // 2. Roles Definition
  const rolesData = [
    {
      id: 'role-admin',
      code: 'admin',
      displayName: 'Administrator',
      description: 'Full administrative access across inventory, staff, POS, and financial reports',
      isSystemManaged: true,
    },
    {
      id: 'role-manager',
      code: 'manager',
      displayName: 'Store Manager',
      description: 'Supervises floor operations, approves purchases, overrides, and reconciliations',
      isSystemManaged: true,
    },
    {
      id: 'role-cashier',
      code: 'cashier',
      displayName: 'Cashier',
      description: 'Processes retail sales transactions, accepts tenders, and issues receipts',
      isSystemManaged: true,
    },
    {
      id: 'role-stock-keeper',
      code: 'stock_keeper',
      displayName: 'Stock Keeper',
      description: 'Conducts goods intake, shelf replenishment, and physical inventory counts',
      isSystemManaged: true,
    },
  ];

  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }
  console.log(`✓ Seeded ${rolesData.length} core roles`);

  // 3. Permissions Definition
  const permissionsData = [
    { id: 'perm-sales-checkout', code: 'sales.checkout', displayName: 'Process Checkout', description: 'Create and tender sales at POS' },
    { id: 'perm-sales-void', code: 'sales.void', displayName: 'Void Sale', description: 'Authorize sale reversals and voids' },
    { id: 'perm-returns-process', code: 'returns.process', displayName: 'Process Returns', description: 'Initiate customer return requests' },
    { id: 'perm-returns-approve', code: 'returns.approve', displayName: 'Approve Returns', description: 'Approve returns and trigger cash/digital refunds' },
    { id: 'perm-purchases-create', code: 'purchases.create', displayName: 'Create Purchase Orders', description: 'Create POs for supplier procurement' },
    { id: 'perm-purchases-approve', code: 'purchases.approve', displayName: 'Approve Purchases', description: 'Approve vendor orders and commit purchasing capital' },
    { id: 'perm-purchases-receive', code: 'purchases.receive', displayName: 'Receive Goods', description: 'Record goods receipts and update moving-average costs' },
    { id: 'perm-inventory-count', code: 'inventory.count', displayName: 'Conduct Stock Counts', description: 'Perform cycle counts and enter physical tallies' },
    { id: 'perm-inventory-adjust', code: 'inventory.adjust', displayName: 'Adjust Stock', description: 'Post manual stock corrections and shrinkage write-offs' },
    { id: 'perm-reports-view', code: 'reports.view', displayName: 'View Reports', description: 'View sales analytics, inventory valuation, and margins' },
    { id: 'perm-users-manage', code: 'users.manage', displayName: 'Manage Staff', description: 'Create and configure user accounts and role assignments' },
    { id: 'perm-settings-manage', code: 'settings.manage', displayName: 'Manage Settings', description: 'Update shop metadata, receipt footers, and POS defaults' },
    { id: 'perm-audit-view', code: 'audit.view', displayName: 'View Audit Logs', description: 'Inspect chronological system events and immutable audit logs' },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { displayName: perm.displayName, description: perm.description },
      create: perm,
    });
  }
  console.log(`✓ Seeded ${permissionsData.length} granular permissions`);

  // 4. Role Permissions Mapping
  const rolePermissionsMap: Record<string, string[]> = {
    admin: permissionsData.map((p) => p.code),
    manager: [
      'sales.checkout',
      'sales.void',
      'returns.process',
      'returns.approve',
      'purchases.create',
      'purchases.approve',
      'purchases.receive',
      'inventory.count',
      'inventory.adjust',
      'reports.view',
      'audit.view',
    ],
    cashier: [
      'sales.checkout',
      'returns.process',
    ],
    stock_keeper: [
      'purchases.receive',
      'inventory.count',
      'inventory.adjust',
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionsMap)) {
    const roleRecord = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!roleRecord) continue;

    for (const code of permCodes) {
      const permRecord = await prisma.permission.findUnique({ where: { code } });
      if (!permRecord) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleRecord.id,
            permissionId: permRecord.id,
          },
        },
        update: {},
        create: {
          roleId: roleRecord.id,
          permissionId: permRecord.id,
        },
      });
    }
  }
  console.log('✓ Configured role-permission assignments');

  // 5. Staff Users
  const usersData = [
    {
      id: 'usr-01',
      shopId: shop.id,
      fullName: 'Nasir Amme',
      email: 'nasir@amme-electronics.et',
      phone: '+251 915 00 11 22',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$nasir_seed_hash_placeholder',
      roleCode: 'admin',
    },
    {
      id: 'usr-02',
      shopId: shop.id,
      fullName: 'Yonas Bekele',
      email: 'yonas@amme-electronics.et',
      phone: '+251 915 33 44 55',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$yonas_seed_hash_placeholder',
      roleCode: 'manager',
    },
    {
      id: 'usr-03',
      shopId: shop.id,
      fullName: 'Tigist Alem',
      email: 'tigist@amme-electronics.et',
      phone: '+251 920 66 77 88',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$tigist_seed_hash_placeholder',
      roleCode: 'cashier',
    },
    {
      id: 'usr-04',
      shopId: shop.id,
      fullName: 'Hamza Mohammed',
      email: 'hamza@amme-electronics.et',
      phone: '+251 930 11 22 33',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hamza_seed_hash_placeholder',
      roleCode: 'cashier',
    },
    {
      id: 'usr-05',
      shopId: shop.id,
      fullName: 'Abel Girma',
      email: 'abel@amme-electronics.et',
      phone: '+251 915 88 99 00',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$abel_seed_hash_placeholder',
      roleCode: 'stock_keeper',
    },
  ];

  for (const u of usersData) {
    const userRecord = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        shopId: u.shopId,
      },
      create: {
        id: u.id,
        shopId: u.shopId,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        passwordHash: u.passwordHash,
        status: 'active',
      },
    });

    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userRecord.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: userRecord.id,
          roleId: role.id,
        },
      });
    }
  }
  console.log(`✓ Seeded ${usersData.length} staff accounts and user roles`);

  // 6. Categories
  const categoriesData = [
    {
      id: 'cat-chargers',
      name: 'Chargers & Power Adapters',
      slug: 'chargers-power',
      description: 'Fast wall chargers, GaN desktop chargers, car chargers, and multi-port plugs',
      iconName: 'Zap',
    },
    {
      id: 'cat-cables',
      name: 'Cables & Interconnects',
      slug: 'cables-interconnects',
      description: 'Braided Type-C, Lightning, Micro USB, HDMI, and OTG data cables',
      iconName: 'Cable',
    },
    {
      id: 'cat-audio',
      name: 'Audio & Wireless Earbuds',
      slug: 'audio-earbuds',
      description: 'TWS earbuds, noise-canceling headphones, and wired earphones',
      iconName: 'Headphones',
    },
    {
      id: 'cat-powerbanks',
      name: 'Power Banks & Batteries',
      slug: 'powerbanks-batteries',
      description: 'High-capacity external battery packs, magnetic wireless power banks',
      iconName: 'BatteryCharging',
    },
    {
      id: 'cat-speakers',
      name: 'Bluetooth Speakers',
      slug: 'bluetooth-speakers',
      description: 'Portable waterproof speakers, desktop sound systems, and party soundboxes',
      iconName: 'Volume2',
    },
    {
      id: 'cat-protection',
      name: 'Screen Protectors & Cases',
      slug: 'protection-cases',
      description: '9H tempered glass, privacy screens, shockproof bumpers, and silicone cases',
      iconName: 'Shield',
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: {
        shopId_slug: {
          shopId: shop.id,
          slug: cat.slug,
        },
      },
      update: {
        name: cat.name,
        description: cat.description,
        iconName: cat.iconName,
      },
      create: {
        id: cat.id,
        shopId: shop.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconName: cat.iconName,
        status: 'active',
      },
    });
  }
  console.log(`✓ Seeded ${categoriesData.length} product categories`);

  // 7. Suppliers
  const suppliersData = [
    {
      id: 'sup-01',
      code: 'SUP-RED-SEA',
      name: 'Red Sea Electronics Trading',
      contactName: 'Ahmed Omar',
      email: 'sales@redsea-trading.com',
      phone: '+251 911 22 33 44',
      city: 'Addis Ababa',
      addressText: 'Bole Medhanealem, Commercial Center 3rd Fl',
      paymentTerms: 'Net 30',
      notes: 'Primary importer for Anker and Baseus accessories',
    },
    {
      id: 'sup-02',
      code: 'SUP-HORN-TECH',
      name: 'Horn of Africa Tech Importers',
      contactName: 'Selamawit Desta',
      email: 'selam@horntech-et.com',
      phone: '+251 915 55 66 77',
      city: 'Dire Dawa',
      addressText: 'Taiwan Market, Block B, Shop #14',
      paymentTerms: 'Net 15',
      notes: 'Local Dire Dawa distributor for cables, car chargers, and screen protectors',
    },
    {
      id: 'sup-03',
      code: 'SUP-DUBAI-DIRECT',
      name: 'Dubai Tech Logistics FZ',
      contactName: 'Farhan Al-Hashemi',
      email: 'export@dubaitechlogistics.ae',
      phone: '+971 4 881 2345',
      city: 'Dubai (Direct Import via Djibouti)',
      addressText: 'Al Quoz Industrial Area 3, Dubai, UAE',
      paymentTerms: 'Immediate / Cash',
      notes: 'Direct bulk electronics consignments shipped through Djibouti port',
    },
    {
      id: 'sup-04',
      code: 'SUP-EAST-DIGITAL',
      name: 'East Star Digital Accessories',
      contactName: 'Kebede Worku',
      email: 'kebede@eaststardigital.com',
      phone: '+251 922 88 99 00',
      city: 'Addis Ababa',
      addressText: 'Merkato, Dubai Tera, Building 4',
      paymentTerms: 'Net 15',
      notes: 'Specializes in audio gear, Oraimo accessories, and power banks',
    },
    {
      id: 'sup-05',
      code: 'SUP-GULF-GLOBAL',
      name: 'Gulf-Africa Spares Co.',
      contactName: 'Tariq Mansoor',
      email: 'orders@gulfafricaspares.com',
      phone: '+251 911 44 55 66',
      city: 'Dire Dawa',
      addressText: 'Near Railway Station, Warehousing Unit 7',
      paymentTerms: 'Consignment',
      notes: 'Replacement batteries, premium cases, and tempered glass inventory',
    },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: {
        shopId_code: {
          shopId: shop.id,
          code: s.code,
        },
      },
      update: {
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        city: s.city,
        addressText: s.addressText,
        paymentTerms: s.paymentTerms,
        notes: s.notes,
      },
      create: {
        id: s.id,
        shopId: shop.id,
        code: s.code,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        city: s.city,
        addressText: s.addressText,
        paymentTerms: s.paymentTerms,
        status: 'active',
        notes: s.notes,
      },
    });
  }
  console.log(`✓ Seeded ${suppliersData.length} suppliers`);

  // 8. Customers
  const customersData = [
    {
      id: 'cust-01',
      displayName: 'Walk-in Customer (General)',
      phone: '+251 900 00 00 00',
      customerType: 'retail',
      city: 'Dire Dawa',
      notes: 'Default walk-in anonymous retail customer account',
    },
    {
      id: 'cust-02',
      displayName: 'Dawit Mengistu',
      phone: '+251 915 22 33 44',
      email: 'dawit.m@gmail.com',
      customerType: 'retail',
      city: 'Dire Dawa',
      creditBalance: new Prisma.Decimal(0.0),
      totalSpent: new Prisma.Decimal(14850.0),
      loyaltyPoints: 148,
      notes: 'Frequent buyer; wholesale and retail client',
    },
    {
      id: 'cust-03',
      displayName: 'Capital Hospitality IT Department',
      phone: '+251 25 111 8899',
      email: 'procurement@capitalhospitality.et',
      customerType: 'wholesale',
      city: 'Dire Dawa',
      creditBalance: new Prisma.Decimal(0.0),
      totalSpent: new Prisma.Decimal(68400.0),
      loyaltyPoints: 684,
      notes: 'Commercial corporate account; orders cables, chargers, and adapters in bulk',
    },
    {
      id: 'cust-04',
      displayName: 'Fatima Abdi',
      phone: '+251 920 44 55 66',
      email: 'fatima.abdi@yahoo.com',
      customerType: 'retail',
      city: 'Dire Dawa',
      creditBalance: new Prisma.Decimal(0.0),
      totalSpent: new Prisma.Decimal(9200.0),
      loyaltyPoints: 92,
      notes: 'Prefers Oraimo and Samsung accessories',
    },
    {
      id: 'cust-05',
      displayName: 'Harar Express Mobile Repair',
      phone: '+251 915 77 88 99',
      customerType: 'wholesale',
      city: 'Harar',
      creditBalance: new Prisma.Decimal(0.0),
      totalSpent: new Prisma.Decimal(45600.0),
      loyaltyPoints: 456,
      notes: 'Wholesale repairs shop; weekly replenishment purchases',
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        displayName: c.displayName,
        phone: c.phone,
        email: c.email,
        customerType: c.customerType,
        city: c.city,
        notes: c.notes,
      },
      create: {
        id: c.id,
        shopId: shop.id,
        displayName: c.displayName,
        phone: c.phone,
        email: c.email,
        customerType: c.customerType,
        city: c.city,
        creditBalance: c.creditBalance ?? new Prisma.Decimal(0),
        totalSpent: c.totalSpent ?? new Prisma.Decimal(0),
        loyaltyPoints: c.loyaltyPoints ?? 0,
        notes: c.notes,
      },
    });
  }
  console.log(`✓ Seeded ${customersData.length} counterparties/customers`);

  // 9. Products & Initial Stock Ledger
  const productsData = [
    {
      id: 'prod-01',
      sku: 'CHG-GAN65W',
      barcode: '6934177701011',
      name: 'Baseus GaN 65W 3-Port Fast Wall Charger',
      brand: 'Baseus',
      categorySlug: 'chargers-power',
      costPrice: 1450,
      sellingPrice: 1950,
      stockQuantity: 28,
      minStockThreshold: 10,
      location: 'Shelf A-01 (Wall Display)',
      description: 'Compact 65W gallium nitride charger with 2x Type-C and 1x USB-A ports. Powers MacBooks and smartphones.',
      warrantyMonths: 6,
    },
    {
      id: 'prod-02',
      sku: 'CHG-SAM45W',
      barcode: '8806091845112',
      name: 'Samsung 45W Super Fast Type-C Adapter EP-T4510',
      brand: 'Samsung',
      categorySlug: 'chargers-power',
      costPrice: 1100,
      sellingPrice: 1600,
      stockQuantity: 18,
      minStockThreshold: 8,
      location: 'Shelf A-02',
      description: 'Original Samsung 45W PD 3.0 PPS fast charger for Galaxy S24/S23 Ultra and Note series.',
      warrantyMonths: 12,
      imageUrl: '/images/products/samsung-ep-t4510-45w.webp',
    },
    {
      id: 'prod-03',
      sku: 'CHG-ANK20W',
      barcode: '194644023112',
      name: 'Anker PowerPort III Nano 20W USB-C',
      brand: 'Anker',
      categorySlug: 'chargers-power',
      costPrice: 750,
      sellingPrice: 1150,
      stockQuantity: 4,
      minStockThreshold: 12,
      location: 'Shelf A-03',
      description: 'Ultra-compact 20W PD cube charger ideal for iPhone 15/14/13/12 series fast charging.',
      warrantyMonths: 18,
    },
    {
      id: 'prod-04',
      sku: 'CHG-LDN32W',
      barcode: '6933138692318',
      name: 'LDNIO 32W Dual QC3.0 Fast Car Charger with LED',
      brand: 'LDNIO',
      categorySlug: 'chargers-power',
      costPrice: 480,
      sellingPrice: 750,
      stockQuantity: 15,
      minStockThreshold: 5,
      location: 'Counter Showcase B',
      description: 'Heavy-duty aluminum alloy car charger with dual Quick Charge 3.0 ports.',
      warrantyMonths: 3,
      imageUrl: '/images/products/ldnio-32w-car-charger.webp',
    },
    {
      id: 'prod-05',
      sku: 'CBL-BAS100W',
      barcode: '6953156209812',
      name: 'Baseus Cafule 100W 2M Nylon Braided Type-C to Type-C',
      brand: 'Baseus',
      categorySlug: 'cables-interconnects',
      costPrice: 320,
      sellingPrice: 550,
      stockQuantity: 42,
      minStockThreshold: 15,
      location: 'Drawer C-01',
      description: 'E-marker chip 100W Power Delivery high speed sync and charging cable.',
      warrantyMonths: 3,
      imageUrl: '/images/products/baseus-cafule-100w-2m.webp',
    },
    {
      id: 'prod-06',
      sku: 'CBL-APP-LGT',
      barcode: '190198001712',
      name: 'Apple Lightning to USB-C Cable (1 Meter)',
      brand: 'Apple',
      categorySlug: 'cables-interconnects',
      costPrice: 650,
      sellingPrice: 950,
      stockQuantity: 19,
      minStockThreshold: 10,
      location: 'Drawer C-02',
      description: 'Original Apple boxed Lightning to Type-C fast charging cable.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-07',
      sku: 'CBL-OTG-3IN1',
      barcode: '6933182109923',
      name: 'Joyroom 3-in-1 Fast Charging Cable (Type-C / Lightning / Micro)',
      brand: 'Joyroom',
      categorySlug: 'cables-interconnects',
      costPrice: 280,
      sellingPrice: 480,
      stockQuantity: 24,
      minStockThreshold: 10,
      location: 'Drawer C-02',
      description: 'Durable nylon 3-in-1 cable supporting 3.5A total output.',
      warrantyMonths: 1,
      imageUrl: '/images/products/joyroom-3-in-1-cable.webp',
    },
    {
      id: 'prod-08',
      sku: 'AUD-AIRPRO2',
      barcode: '194253397168',
      name: 'Apple AirPods Pro 2nd Gen with MagSafe Case (USB-C)',
      brand: 'Apple',
      categorySlug: 'audio-earbuds',
      costPrice: 19500,
      sellingPrice: 24500,
      stockQuantity: 5,
      minStockThreshold: 3,
      location: 'Secure Glass Cabinet 1',
      description: 'Flagship ANC true wireless earbuds with H2 chip and Adaptive Audio.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-09',
      sku: 'AUD-ANK-P20I',
      barcode: '194644128912',
      name: 'Soundcore by Anker P20i True Wireless Earbuds',
      brand: 'Anker',
      categorySlug: 'audio-earbuds',
      costPrice: 1850,
      sellingPrice: 2550,
      stockQuantity: 14,
      minStockThreshold: 6,
      location: 'Display Cabinet 1',
      description: '10mm drivers with custom EQ via Soundcore app, 30 hours battery life with fast charge.',
      warrantyMonths: 12,
      imageUrl: '/images/products/soundcore-p20i-earbuds.webp',
    },
    {
      id: 'prod-10',
      sku: 'AUD-SNY-CH520',
      barcode: '4548736140812',
      name: 'Sony WH-CH520 Wireless Bluetooth Headphones',
      brand: 'Sony',
      categorySlug: 'audio-earbuds',
      costPrice: 3800,
      sellingPrice: 5100,
      stockQuantity: 7,
      minStockThreshold: 4,
      location: 'Display Cabinet 2',
      description: 'On-ear lightweight headphones with 50-hour battery life, multipoint pairing, DSEE audio.',
      warrantyMonths: 12,
      imageUrl: '/images/products/sony-wh-ch520-headphones.webp',
    },
    {
      id: 'prod-11',
      sku: 'AUD-SAM-BUDS2',
      barcode: '8806094582101',
      name: 'Samsung Galaxy Buds FE Graphite',
      brand: 'Samsung',
      categorySlug: 'audio-earbuds',
      costPrice: 6200,
      sellingPrice: 7900,
      stockQuantity: 6,
      minStockThreshold: 4,
      location: 'Secure Glass Cabinet 1',
      description: 'Ergonomic wing-tip comfort, powerful ANC, deep bass, seamless Galaxy ecosystem switch.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-12',
      sku: 'PWR-ANK-20K',
      barcode: '194644089903',
      name: 'Anker 325 Power Bank PowerCore 20000mAh',
      brand: 'Anker',
      categorySlug: 'powerbanks-batteries',
      costPrice: 2650,
      sellingPrice: 3600,
      stockQuantity: 14,
      minStockThreshold: 6,
      location: 'Shelf D-01',
      description: 'Ultra-high capacity 20,000mAh battery pack with PowerIQ technology and dual USB output.',
      warrantyMonths: 18,
    },
    {
      id: 'prod-13',
      sku: 'PWR-ORA-10K-MAG',
      barcode: '4895180771212',
      name: 'Oraimo MagCharge 10000mAh Magnetic Wireless Power Bank',
      brand: 'Oraimo',
      categorySlug: 'powerbanks-batteries',
      costPrice: 2400,
      sellingPrice: 3350,
      stockQuantity: 8,
      minStockThreshold: 5,
      location: 'Display Cabinet 2',
      description: '15W wireless MagSafe compatible battery with foldable kickstand and 20W PD Type-C port.',
      warrantyMonths: 12,
      imageUrl: '/images/products/oraimo-magcharge-10000mah.webp',
    },
    {
      id: 'prod-14',
      sku: 'PWR-ORA-TOAST',
      barcode: '4895180772092',
      name: 'Oraimo Toast 10 Flash 10000mAh Power Bank',
      brand: 'Oraimo',
      categorySlug: 'powerbanks-batteries',
      costPrice: 1150,
      sellingPrice: 1650,
      stockQuantity: 3,
      minStockThreshold: 10,
      location: 'Shelf D-03',
      description: 'Slimline pocket-friendly 10,000mAh with 2.4A dual fast charging.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-15',
      sku: 'SPK-JBL-FLIP6',
      barcode: '6925281993022',
      name: 'JBL Flip 6 Portable Waterproof Bluetooth Speaker',
      brand: 'JBL',
      categorySlug: 'bluetooth-speakers',
      costPrice: 8500,
      sellingPrice: 11200,
      stockQuantity: 6,
      minStockThreshold: 3,
      location: 'Showcase Table Center',
      description: '2-way speaker system, IP67 waterproof & dustproof, 12 hours playtime.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-16',
      sku: 'SPK-ORA-SOUND',
      barcode: '4895180789012',
      name: 'Oraimo SoundGo 4 Ultra-Portable Bluetooth Speaker',
      brand: 'Oraimo',
      categorySlug: 'bluetooth-speakers',
      costPrice: 1400,
      sellingPrice: 2100,
      stockQuantity: 12,
      minStockThreshold: 5,
      location: 'Showcase Table Center',
      description: 'Rugged fabric finish, lanyard loop, punchy bass, FM radio built-in.',
      warrantyMonths: 6,
    },
    {
      id: 'prod-17',
      sku: 'CAS-IP15P-MAG',
      barcode: '6974128501192',
      name: 'Torras Magnetic Shockproof Case iPhone 15 Pro',
      brand: 'Torras',
      categorySlug: 'protection-cases',
      costPrice: 850,
      sellingPrice: 1350,
      stockQuantity: 22,
      minStockThreshold: 8,
      location: 'Rack E-01',
      description: 'Military grade drop protection with integrated Halbach MagSafe magnetic array.',
      warrantyMonths: 0,
    },
    {
      id: 'prod-18',
      sku: 'PRT-SAM-S24U-PV',
      barcode: '6933182103429',
      name: 'Samsung Galaxy S24 Ultra Privacy Anti-Spy Screen Glass',
      brand: 'Joyroom',
      categorySlug: 'protection-cases',
      costPrice: 180,
      sellingPrice: 380,
      stockQuantity: 32,
      minStockThreshold: 15,
      location: 'Drawer D-02',
      description: '28-degree privacy filter prevents side-angle peeking, full curved coverage.',
      warrantyMonths: 0,
      imageUrl: '/images/products/samsung-s24-ultra-privacy-glass.webp',
    },
    {
      id: 'prod-19',
      sku: 'PRT-MAG-CASE-IP15',
      barcode: '6953156239121',
      name: 'Baseus Magnetic Crystal Clear Case for iPhone 15 Pro Max',
      brand: 'Baseus',
      categorySlug: 'protection-cases',
      costPrice: 350,
      sellingPrice: 650,
      stockQuantity: 16,
      minStockThreshold: 8,
      location: 'Wall Hook E-04',
      description: 'Anti-yellowing polycarbonate case with 38 N52 high-grade neodymium magnets for MagSafe.',
      warrantyMonths: 1,
      imageUrl: '/images/products/baseus-iphone-15-pro-max-case.webp',
    },
    {
      id: 'prod-20',
      sku: 'ACC-CAR-MNT',
      barcode: '6953156251212',
      name: 'Baseus 360° Magnetic Air Vent Car Phone Mount',
      brand: 'Baseus',
      categorySlug: 'protection-cases',
      costPrice: 260,
      sellingPrice: 480,
      stockQuantity: 21,
      minStockThreshold: 8,
      location: 'Counter Showcase B',
      description: 'Compact air-vent smartphone car holder with 4 strong rubidium magnets.',
      warrantyMonths: 6,
      imageUrl: '/images/products/baseus-car-phone-mount.webp',
    },
  ];

  for (const p of productsData) {
    const category = await prisma.category.findUnique({
      where: {
        shopId_slug: {
          shopId: shop.id,
          slug: p.categorySlug,
        },
      },
    });

    if (!category) {
      console.warn(`Category slug ${p.categorySlug} not found for product ${p.sku}`);
      continue;
    }

    const productRecord = await prisma.product.upsert({
      where: {
        id: p.id,
      },
      update: {
        sku: p.sku,
        barcode: p.barcode,
        deletedAt: null,
        isArchived: false,
        name: p.name,
        brand: p.brand,
        categoryId: category.id,
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
        averageCost: new Prisma.Decimal(p.costPrice),
        onHand: p.stockQuantity,
        reorderLevel: p.minStockThreshold,
        location: p.location,
        description: p.description,
        warrantyMonths: p.warrantyMonths,
        imageUrl: (p as any).imageUrl ?? undefined,
        status: 'active',
      },
      create: {
        id: p.id,
        shopId: shop.id,
        categoryId: category.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        brand: p.brand,
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
        averageCost: new Prisma.Decimal(p.costPrice),
        onHand: p.stockQuantity,
        reorderLevel: p.minStockThreshold,
        location: p.location,
        description: p.description,
        warrantyMonths: p.warrantyMonths,
        imageUrl: (p as any).imageUrl ?? null,
        status: 'active',
      },
    });

    // Verify initial stock movement in ledger for audit balance
    const existingMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: productRecord.id,
        movementType: 'opening_balance',
      },
    });

    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: {
          shopId: shop.id,
          productId: productRecord.id,
          movementType: 'opening_balance',
          quantityDelta: p.stockQuantity,
          unitCostSnapshot: new Prisma.Decimal(p.costPrice),
          previousStock: 0,
          balanceAfter: p.stockQuantity,
          referenceNumber: 'SYSTEM-INIT-2026',
          sourceType: 'initial_seed',
          reason: 'Initial physical inventory count and baseline ledger balance',
        },
      });
    }
  }
  console.log(`✓ Seeded ${productsData.length} products with initial stock movement ledger records`);

  // 10. Purchase Orders Seeding (Inbound Procurement)
  console.log('Seeding enterprise purchase orders...');
  const cableProd = await prisma.product.findFirst({ where: { sku: 'CBL-APP-LGT' } });
  const chargerProd = await prisma.product.findFirst({ where: { sku: 'CHG-ANK20W' } });
  const airpodProd = await prisma.product.findFirst({ where: { sku: 'AUD-AIRPRO2' } });

  const supRedSea = await prisma.supplier.findFirst({ where: { code: 'SUP-RED-SEA' } });
  const supDubai = await prisma.supplier.findFirst({ where: { code: 'SUP-DUBAI-DIRECT' } });

  if (supRedSea && cableProd && chargerProd) {
    const existingPO104 = await prisma.purchaseOrder.findFirst({
      where: { shopId: shop.id, poNumber: 'PO-2026-104' },
    });
    if (!existingPO104) {
      await prisma.purchaseOrder.create({
        data: {
          shopId: shop.id,
          poNumber: 'PO-2026-104',
          supplierId: supRedSea.id,
          orderedAt: new Date('2026-10-10'),
          expectedAt: new Date('2026-10-16'),
          status: 'ordered',
          subtotal: new Prisma.Decimal(32250.0),
          grandTotal: new Prisma.Decimal(32250.0),
          notes: 'Standard replenishment from Red Sea Electronics Addis Ababa hub',
          createdBy: 'Nasir Amme',
          items: {
            create: [
              {
                productId: cableProd.id,
                orderedQuantity: 35,
                receivedQuantity: 0,
                unitCost: new Prisma.Decimal(650.0),
                totalCost: new Prisma.Decimal(22750.0),
              },
              {
                productId: chargerProd.id,
                orderedQuantity: 20,
                receivedQuantity: 0,
                unitCost: new Prisma.Decimal(475.0),
                totalCost: new Prisma.Decimal(9500.0),
              },
            ],
          },
        },
      });
      console.log('✓ Seeded PO-2026-104 (Red Sea Electronics)');
    }
  }

  if (supDubai && airpodProd && chargerProd) {
    const existingPO105 = await prisma.purchaseOrder.findFirst({
      where: { shopId: shop.id, poNumber: 'PO-2026-105' },
    });
    if (!existingPO105) {
      await prisma.purchaseOrder.create({
        data: {
          shopId: shop.id,
          poNumber: 'PO-2026-105',
          supplierId: supDubai.id,
          orderedAt: new Date('2026-10-13'),
          expectedAt: new Date('2026-10-24'),
          status: 'ordered',
          subtotal: new Prisma.Decimal(112500.0),
          grandTotal: new Prisma.Decimal(112500.0),
          notes: 'Direct bulk electronics consignment shipped via Djibouti port',
          createdBy: 'Nasir Amme',
          items: {
            create: [
              {
                productId: airpodProd.id,
                orderedQuantity: 5,
                receivedQuantity: 0,
                unitCost: new Prisma.Decimal(19500.0),
                totalCost: new Prisma.Decimal(97500.0),
              },
              {
                productId: chargerProd.id,
                orderedQuantity: 20,
                receivedQuantity: 0,
                unitCost: new Prisma.Decimal(750.0),
                totalCost: new Prisma.Decimal(15000.0),
              },
            ],
          },
        },
      });
      console.log('✓ Seeded PO-2026-105 (Dubai Tech Logistics)');
    }
  }

  // 11. POS Cash Sessions & Historical Sales Transactions
  console.log('Seeding enterprise POS cash sessions and sales ledger...');

  const cashierUser = await prisma.user.findFirst({ where: { email: 'tigist@amme-electronics.et' } });
  const walkInCust = await prisma.customer.findFirst({ where: { displayName: { contains: 'Walk-in' } } });
  const corpCust = await prisma.customer.findFirst({ where: { displayName: { contains: 'Capital Hospitality' } } });

  // Open POS Cash Session #12
  const activeSession = await prisma.cashSession.upsert({
    where: {
      shopId_sessionNumber: {
        shopId: shop.id,
        sessionNumber: 'CS-20261022-012',
      },
    },
    update: {
      status: 'open',
      openingFloat: new Prisma.Decimal(12400.0),
      totalTelebirr: new Prisma.Decimal(18450.0),
      totalCbeBirr: new Prisma.Decimal(10200.0),
      totalSalesCash: new Prisma.Decimal(6450.0),
      notes: 'POS Shift #12 open (Drawer: 12,400.00 ETB)',
    },
    create: {
      shopId: shop.id,
      cashierId: cashierUser?.id || usersData[0].id,
      sessionNumber: 'CS-20261022-012',
      status: 'open',
      openingFloat: new Prisma.Decimal(12400.0),
      totalTelebirr: new Prisma.Decimal(18450.0),
      totalCbeBirr: new Prisma.Decimal(10200.0),
      totalSalesCash: new Prisma.Decimal(6450.0),
      notes: 'POS Shift #12 open (Drawer: 12,400.00 ETB)',
      openedAt: new Date(),
    },
  });
  console.log(`✓ Seeded Cash Session #${activeSession.sessionNumber} (Shift #12 Open)`);

  // Target products for sales
  const p1 = await prisma.product.findFirst({ where: { id: 'prod-01' } });
  const p2 = await prisma.product.findFirst({ where: { id: 'prod-02' } });
  const p3 = await prisma.product.findFirst({ where: { id: 'prod-03' } });
  const p5 = await prisma.product.findFirst({ where: { id: 'prod-05' } });
  const p8 = await prisma.product.findFirst({ where: { id: 'prod-08' } });
  const p12 = await prisma.product.findFirst({ where: { id: 'prod-12' } });
  const p18 = await prisma.product.findFirst({ where: { id: 'prod-18' } });

  const salesToSeed = [
    {
      receiptNumber: 'REC-2026-0084',
      soldAt: new Date(),
      subtotal: 2450.0,
      grandTotal: 2450.0,
      paymentMethod: 'telebirr',
      customerId: walkInCust?.id,
      customerNotes: 'Walk-in Counter',
      items: [
        { prod: p5 || p1, qty: 1, price: 1500.0, cogs: 950.0 },
        { prod: p18 || p3, qty: 1, price: 950.0, cogs: 400.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0083',
      soldAt: new Date(Date.now() - 1000 * 60 * 75),
      subtotal: 5000.0,
      grandTotal: 5000.0,
      paymentMethod: 'cbe_birr',
      customerId: walkInCust?.id,
      customerNotes: 'Gende Kore Phone Clinic',
      items: [
        { prod: p2 || p1, qty: 2, price: 2500.0, cogs: 1600.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0082',
      soldAt: new Date(Date.now() - 1000 * 60 * 145),
      subtotal: 8700.0,
      grandTotal: 8700.0,
      paymentMethod: 'cash',
      customerId: walkInCust?.id,
      customerNotes: 'Dr. Henok Tadesse',
      items: [
        { prod: p12 || p1, qty: 1, price: 4200.0, cogs: 2900.0 },
        { prod: p3 || p1, qty: 3, price: 1500.0, cogs: 900.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0081',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      subtotal: 2950.0,
      grandTotal: 2950.0,
      paymentMethod: 'telebirr',
      customerId: walkInCust?.id,
      customerNotes: 'Walk-in Counter',
      items: [
        { prod: p1 || p3, qty: 1, price: 2000.0, cogs: 1300.0 },
        { prod: p18 || p3, qty: 1, price: 950.0, cogs: 400.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0080',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
      subtotal: 8000.0,
      grandTotal: 8000.0,
      paymentMethod: 'bank_transfer',
      customerId: corpCust?.id,
      customerNotes: 'Capital Hospitality Group',
      items: [
        { prod: p2 || p1, qty: 2, price: 2500.0, cogs: 1600.0 },
        { prod: p5 || p1, qty: 2, price: 1500.0, cogs: 950.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0079',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      subtotal: 4500.0,
      grandTotal: 4500.0,
      paymentMethod: 'cbe_birr',
      customerId: walkInCust?.id,
      customerNotes: 'Taiwan Market Retail Client',
      items: [
        { prod: p12 || p1, qty: 1, price: 4500.0, cogs: 2900.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0078',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
      subtotal: 12000.0,
      grandTotal: 12000.0,
      paymentMethod: 'telebirr',
      customerId: walkInCust?.id,
      customerNotes: 'Dire Dawa University Staff',
      items: [
        { prod: p1 || p2, qty: 4, price: 2000.0, cogs: 1300.0 },
        { prod: p12 || p3, qty: 1, price: 4000.0, cogs: 2900.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0077',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
      subtotal: 6500.0,
      grandTotal: 6500.0,
      paymentMethod: 'cash',
      customerId: walkInCust?.id,
      customerNotes: 'Walk-in Counter',
      items: [
        { prod: p3 || p1, qty: 3, price: 1500.0, cogs: 900.0 },
        { prod: p5 || p1, qty: 2, price: 1000.0, cogs: 600.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0076',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
      subtotal: 9200.0,
      grandTotal: 9200.0,
      paymentMethod: 'cbe_birr',
      customerId: corpCust?.id,
      customerNotes: 'B-Capital Hotel IT',
      items: [
        { prod: p1 || p2, qty: 3, price: 2000.0, cogs: 1300.0 },
        { prod: p2 || p1, qty: 1, price: 3200.0, cogs: 2000.0 },
      ],
    },
    {
      receiptNumber: 'REC-2026-0075',
      soldAt: new Date(Date.now() - 1000 * 60 * 60 * 144),
      subtotal: 7800.0,
      grandTotal: 7800.0,
      paymentMethod: 'telebirr',
      customerId: walkInCust?.id,
      customerNotes: 'Walk-in Counter',
      items: [
        { prod: p12 || p1, qty: 1, price: 4200.0, cogs: 2900.0 },
        { prod: p5 || p3, qty: 3, price: 1200.0, cogs: 700.0 },
      ],
    },
  ];

  for (const s of salesToSeed) {
    const existing = await prisma.sale.findUnique({
      where: {
        shopId_receiptNumber: {
          shopId: shop.id,
          receiptNumber: s.receiptNumber,
        },
      },
    });

    if (!existing) {
      const createdSale = await prisma.sale.create({
        data: {
          shopId: shop.id,
          receiptNumber: s.receiptNumber,
          customerId: s.customerId,
          cashierId: cashierUser?.id || usersData[0].id,
          status: 'posted',
          soldAt: s.soldAt,
          subtotal: new Prisma.Decimal(s.subtotal),
          discountTotal: new Prisma.Decimal(0.0),
          taxTotal: new Prisma.Decimal(0.0),
          grandTotal: new Prisma.Decimal(s.grandTotal),
          notes: s.customerNotes,
          items: {
            create: s.items
              .filter((it) => it.prod)
              .map((it) => ({
                productId: it.prod!.id,
                skuSnapshot: it.prod!.sku,
                nameSnapshot: it.prod!.name,
                quantity: it.qty,
                unitPrice: new Prisma.Decimal(it.price),
                unitCostSnapshot: new Prisma.Decimal(it.cogs),
                lineSubtotal: new Prisma.Decimal(it.price * it.qty),
                lineTotal: new Prisma.Decimal(it.price * it.qty),
                lineCogs: new Prisma.Decimal(it.cogs * it.qty),
                lineGrossProfit: new Prisma.Decimal((it.price - it.cogs) * it.qty),
                warrantyMonthsSnapshot: it.prod!.warrantyMonths || 6,
              })),
          },
          payments: {
            create: [
              {
                shopId: shop.id,
                cashSessionId: activeSession.id,
                method: s.paymentMethod,
                status: 'succeeded',
                amount: new Prisma.Decimal(s.grandTotal),
                amountTendered: new Prisma.Decimal(s.grandTotal),
                changeGiven: new Prisma.Decimal(0.0),
                currencyCode: 'ETB',
                providerReference: `FT-REF-${Math.floor(100000 + Math.random() * 900000)}`,
                recordedBy: cashierUser?.fullName || 'Tigist Alem',
                receivedAt: s.soldAt,
              },
            ],
          },
        },
      });
      console.log(`✓ Seeded Sale ${createdSale.receiptNumber} (${s.grandTotal} ETB)`);
    }
  }

  console.log('✅ Phase 1 Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
