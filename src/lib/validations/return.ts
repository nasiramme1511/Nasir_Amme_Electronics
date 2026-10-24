import { z } from "zod";

export const ProcessReturnSchema = z.object({
  originalReceiptId: z.string().min(1, "Receipt ID required"),
  productId: z.string().min(1, "Product SKU or ID required"),
  quantity: z.number().int().positive("Return quantity must be at least 1"),
  reason: z.enum(["DEFECTIVE_HARDWARE", "CUSTOMER_REGRET", "WRONG_SPECIFICATION"], {
    error: "Select a valid claim reason",
  }),
  disposition: z.enum(["RESTOCKED_TO_SHELF", "QUARANTINE_DEFECTIVE"], {
    error: "Select a warehouse disposition route",
  }),
  payoutMode: z.enum(["CASH_DRAWER", "TELEBIRR_REVERSAL", "STORE_CREDIT"], {
    error: "Select a valid settlement payout channel",
  }),
  inspectionNotes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type ProcessReturnInput = z.infer<typeof ProcessReturnSchema>;
