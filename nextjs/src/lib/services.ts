import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a service name").max(80),
  description: z.string().trim().min(5, "Describe this service").max(300),
  category: z.enum(["Consultation", "Wellness", "Coaching"]),
  durationMinutes: z.number().int().min(15).max(240),
  price: z.number().int().positive("Price must be greater than zero"),
  color: z.enum(["indigo", "rose", "amber", "cyan", "emerald", "violet"]),
  active: z.boolean(),
});

export function slugifyServiceName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
