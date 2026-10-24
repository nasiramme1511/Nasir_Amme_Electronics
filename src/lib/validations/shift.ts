import { z } from "zod";

export const OpenShiftSchema = z.object({
  openingFloat: z.number().nonnegative("Opening cash float cannot be negative"),
  notes: z.string().max(500).optional(),
});

export const CloseShiftSchema = z.object({
  sessionId: z.string().uuid("Valid session UUID required"),
  closingCashCounted: z.number().nonnegative("Counted cash cannot be negative"),
  notes: z.string().max(2000).optional(),
});

export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;
export type CloseShiftInput = z.infer<typeof CloseShiftSchema>;
