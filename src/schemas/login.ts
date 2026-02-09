import { z } from "zod";

export const loginSchema = z.object({
    username: z.string().trim().min(1).max(255).or(z.string().trim().min(1).max(255).email()),
    password: z.string().trim().min(1).max(255),
});