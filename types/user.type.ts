import {z} from "zod";

export const UserSchema = z.object({
    fullname: z.string().min(1, "First name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    role: z.enum(["admin", "user"]).default("user")
});

export type UserType = z.infer<typeof UserSchema>;