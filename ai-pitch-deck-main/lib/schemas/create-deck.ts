import { z } from "zod";

export const CreateDeckSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(20, "Project idea must be at least 20 characters.")
    .max(2000, "Project idea must be at most 2,000 characters."),
});
