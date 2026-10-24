import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(250, "Description cannot exceed 250 characters").optional().or(z.literal("")),
  iconName: z.string().default("FolderTree"),
  posVisible: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
