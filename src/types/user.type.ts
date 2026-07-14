import {z} from "zod";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

export const optionalPasswordString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(6, "Password must be at least 6 characters long").optional()
);

const optionalGender = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.enum(["male", "female", "other", "prefer-not-to-say"]).optional()
);

export const UserSchema = z.object({
    fullname: z.string().min(1, "First name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    role: z.enum(["admin", "user"]).default("user"),
    phoneNumber: optionalString,
    profileImage: optionalString,
    gender: optionalGender,
    dateOfBirth: optionalString,
    address: optionalString
});

export type UserType = z.infer<typeof UserSchema>;
