import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "nameMin" })
    .max(100, { message: "nameMax" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "emailRequired" })
    .email({ message: "emailInvalid" }),
  service: z.string().trim().min(1, { message: "serviceRequired" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "messageMin" })
    .max(2000, { message: "messageMax" }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
