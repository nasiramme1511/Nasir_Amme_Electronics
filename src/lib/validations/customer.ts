import { z } from "zod";

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(9, "Valid phone number required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  customerType: z.enum(["RETAIL", "WHOLESALE", "CORPORATE", "REPAIR_CLINIC"]).default("RETAIL"),
  priceTier: z.enum(["STANDARD", "TIER_1_WHOLESALE", "TIER_2_VIP", "STAFF"]).default("STANDARD"),
  tinNumber: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), {
    message: "TIN must be 10 numeric digits",
  }),
  allowCredit: z.boolean().default(false),
  creditLimit: z.coerce.number().nonnegative().default(0),
  paymentTerms: z.enum(["IMMEDIATE", "NET_7", "NET_15", "NET_30"]).default("IMMEDIATE"),
  city: z.string().default("Dire Dawa"),
  kebeleOrStreet: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
