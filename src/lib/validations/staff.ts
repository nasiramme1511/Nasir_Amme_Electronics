import { z } from "zod";

export const ProvisionStaffSchema = z.object({
  fullName: z.string().min(2, "Full legal name is required"),
  phone: z.string().min(9, "Valid phone number required"),
  email: z.string().email("Must be a valid email format").toLowerCase(),
  role: z.enum(["CASHIER", "INVENTORY_CLERK", "STORE_MANAGER", "ADMIN"]),
  tempPassword: z.string().min(8, "Password must be at least 8 characters"),
  quickPin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
    .optional()
    .or(z.literal("")),
  forcePasswordChange: z.boolean().default(true),
});

export type ProvisionStaffInput = z.infer<typeof ProvisionStaffSchema>;
