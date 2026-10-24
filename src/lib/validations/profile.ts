import { z } from "zod";

export const UpdateAdminPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "Requires at least one uppercase letter")
      .regex(/[0-9]/, "Requires at least one numerical digit"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UpdateAdminPasswordInput = z.infer<typeof UpdateAdminPasswordSchema>;

export const UpdateQuickPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "POS PIN must be exactly 4 digits"),
});

export type UpdateQuickPinInput = z.infer<typeof UpdateQuickPinSchema>;
