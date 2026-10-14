import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Nasir Amme Electronics database seed...');

  // 1. Primary Shop Record (Dire Dawa, Ethiopia)
  const shop = await prisma.shop.upsert({
    where: { id: 'shop-dire-dawa-01' },
    update: {},
    create: {
      id: 'shop-dire-dawa-01',
      name: 'Nasir Amme Electronics',
      legalName: 'Nasir Amme Consumer Electronics Retail & Spares',
      tinNumber: 'DEMO-TIN-0049281734',
      city: 'Dire Dawa',
      addressText: 'Kebele 02, Commercial District, Near B-Capital Hotel',
      countryCode: 'ET',
      currencyCode: 'ETB',
      timeZone: 'Africa/Addis_Ababa',
      phonePrimary: '+251 915 00 11 22',
      phoneSecondary: '+251 25 111 4455',
      email: 'info@amme-electronics.et',
      receiptHeader: 'Welcome to Nasir Amme Electronics • Dire Dawa\nNear B-Capital Hotel • Genuine Tech Gear',
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
      notes: 'Frequent buyer; works near B-Capital Hotel',
    },
    {
      id: 'cust-03',
      displayName: 'B-Capital Hotel IT Department',
      phone: '+251 25 111 8899',
      email: 'it@bcapitalhotel.com',
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
      sku: 'CBL-ANK-3IN1',
      barcode: '194644045213',
      name: 'Anker PowerLine II 3-in-1 Universal Cable',
      brand: 'Anker',
      categorySlug: 'cables-interconnects',
      costPrice: 580,
      sellingPrice: 900,
      stockQuantity: 11,
      minStockThreshold: 8,
      location: 'Drawer C-03',
      description: 'Interchangeable Micro USB, USB-C, and Lightning connector heads.',
      warrantyMonths: 12,
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
      sku: 'AUD-ORA-FREE',
      barcode: '4895180761201',
      name: 'Oraimo FreePods 4 ANC TWS Wireless Earbuds',
      brand: 'Oraimo',
      categorySlug: 'audio-earbuds',
      costPrice: 1850,
      sellingPrice: 2600,
      stockQuantity: 24,
      minStockThreshold: 10,
      location: 'Shelf B-01',
      description: 'Active Noise Cancellation, 35.5-hour playback, low latency gaming mode.',
      warrantyMonths: 12,
    },
    {
      id: 'prod-10',
      sku: 'AUD-JBL-T520',
      barcode: '6925281966545',
      name: 'JBL Tune 520BT Wireless On-Ear Headphones',
      brand: 'JBL',
      categorySlug: 'audio-earbuds',
      costPrice: 3400,
      sellingPrice: 4800,
      stockQuantity: 8,
      minStockThreshold: 4,
      location: 'Shelf B-02',
      description: 'PureBass sound, Bluetooth 5.3, up to 57 hours battery with speed charge.',
      warrantyMonths: 6,
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
      sku: 'PWR-BAS-BLD',
      barcode: '6934177723419',
      name: 'Baseus Blade 100W Ultra-Thin Laptop Power Bank 20000mAh',
      brand: 'Baseus',
      categorySlug: 'powerbanks-batteries',
      costPrice: 5800,
      sellingPrice: 7800,
      stockQuantity: 7,
      minStockThreshold: 4,
      location: 'Shelf D-02',
      description: 'Only 18mm thin, full 100W PD output for laptops, status digital display.',
      warrantyMonths: 6,
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
      sku: 'CAS-S24U-CLR',
      barcode: '8806091230091',
      name: 'Spigen Ultra Hybrid Clear Case Galaxy S24 Ultra',
      brand: 'Spigen',
      categorySlug: 'protection-cases',
      costPrice: 920,
      sellingPrice: 1450,
      stockQuantity: 16,
      minStockThreshold: 6,
      location: 'Rack E-02',
      description: 'Anti-yellowing crystal clear rigid back with shock-absorbing TPU bumper.',
      warrantyMonths: 0,
    },
    {
      id: 'prod-19',
      sku: 'GLS-IP15-PRIV',
      barcode: '6952210844129',
      name: 'Benks 9H 28° Privacy Tempered Glass for iPhone 15/15 Pro',
      brand: 'Benks',
      categorySlug: 'protection-cases',
      costPrice: 380,
      sellingPrice: 650,
      stockQuantity: 35,
      minStockThreshold: 15,
      location: 'Drawer F-01',
      description: '28-degree micro-louver privacy angle with full auto-alignment install tray.',
      warrantyMonths: 0,
    },
    {
      id: 'prod-20',
      sku: 'GLS-S24U-UV',
      barcode: '6952210844990',
      name: 'Mocolo UV Liquid Full-Glue Curved Tempered Glass S24 Ultra',
      brand: 'Mocolo',
      categorySlug: 'protection-cases',
      costPrice: 420,
      sellingPrice: 750,
      stockQuantity: 18,
      minStockThreshold: 8,
      location: 'Drawer F-02',
      description: 'Liquid optical adhesive with UV lamp curing; preserves ultrasonic fingerprint unlock.',
      warrantyMonths: 0,
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
        shopId_sku: {
          shopId: shop.id,
          sku: p.sku,
        },
      },
      update: {
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
