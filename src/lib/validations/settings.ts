import { z } from "zod";

export const UpdateShopSettingsSchema = z.object({
  displayName: z.string().min(2, "Store display name is required"),
  legalEntityName: z.string().min(2, "Legal business registration name is required"),
  tinNumber: z.string().regex(/^\d{10}$/, "TIN must be exactly 10 numeric digits"),
  vatNumber: z.string().optional(),
  cityRegion: z.string().min(2),
  streetKebele: z.string().min(2),
  landmark: z.string().optional(),
  primaryPhone: z.string().min(9, "Valid phone number is required"),
  officialEmail: z.string().email("Valid official email required"),
  
  // POS Layout
  receiptHeaderNotice: z.string().max(80).optional(),
  receiptFooterNotice: z.string().max(120).optional(),
  paperWidth: z.enum(["80mm", "58mm"]).default("80mm"),
  printVatBreakdown: z.boolean().default(true),
  printCashierName: z.boolean().default(true),

  // Inventory Policy
  globalLowStockThreshold: z.number().int().min(1).default(5),
  preventNegativeStockSales: z.boolean().default(true),
  strictBarcodeEnforcement: z.boolean().default(false),
});

export type UpdateShopSettingsInput = z.infer<typeof UpdateShopSettingsSchema>;
