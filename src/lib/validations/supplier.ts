import { z } from "zod";

export const CreateSupplierSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  tinNumber: z.string().regex(/^\d{10}$/, "TIN must be a 10-digit numerical identifier"),
  vatRegistered: z.boolean().default(true),
  contactPerson: z.string().min(2, "Contact person name is required"),
  phone: z.string().min(9, "Valid phone number required"),
  altPhone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  cityHub: z.enum(["Dire Dawa", "Addis Ababa", "Harar", "Hawassa", "Djibouti", "Import / UAE"]),
  address: z.string().optional(),
  paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "NET_60"]).default("NET_15"),
  creditLimit: z.coerce.number().nonnegative().default(0),
  bankDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
