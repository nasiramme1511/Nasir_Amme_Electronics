import { z } from "zod";

export const CheckoutItemSchema = z.object({
  productId: z.string().uuid("Valid product ID required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  discount: z.number().nonnegative("Discount cannot be negative").default(0),
});

export const CheckoutPaymentSchema = z.object({
  method: z.enum(["cash", "telebirr", "cbe_birr", "bank_transfer", "credit"], {
    error: "Select a valid settlement channel",
  }),
  amount: z.number().positive("Payment amount must be greater than zero"),
  amountTendered: z.number().nonnegative().optional(),
  providerReference: z.string().max(100).optional(),
});

export const POSCheckoutSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(2, "Customer identifier required").default("Walk-in Customer"),
  customerType: z.enum(["retail", "wholesale"]).default("retail"),
  items: z.array(CheckoutItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().nonnegative("Subtotal cannot be negative"),
  discountTotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().positive("Grand total must be greater than zero"),
  payments: z.array(CheckoutPaymentSchema).min(1, "At least one payment split required"),
  cashSessionId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(8).optional(),
  notes: z.string().max(500).optional(),
});

export type POSCheckoutInput = z.infer<typeof POSCheckoutSchema>;
export type CheckoutItemInput = z.infer<typeof CheckoutItemSchema>;
export type CheckoutPaymentInput = z.infer<typeof CheckoutPaymentSchema>;
