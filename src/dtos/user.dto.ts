import {z} from "zod";
import { optionalPasswordString, UserSchema } from "../types/user.type";

export const CreateUserDTO = UserSchema.pick({
    fullname: true,
    email: true,
    password: true,
    phoneNumber: true,
    gender: true,
    dateOfBirth: true,
    address: true,
    
});

export type CreateUserDTO = z.infer<typeof CreateUserDTO>;


export const LoginUserDTO = UserSchema.pick({
    email: true,
    password: true
});

export const UpdateUserDTO = UserSchema.pick({
    fullname: true,
    email: true,
    phoneNumber: true,
    profileImage: true,
    gender: true,
    dateOfBirth: true,
    address: true
}).partial().extend({
    password: optionalPasswordString,
    currentPassword: z.preprocess(
        (value) => value === "" ? undefined : value,
        z.string().min(6, "Current password must be at least 6 characters long").optional()
    )
});
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

export type LoginUserDTO = z.infer<typeof LoginUserDTO>

export const AdminCreateUserDTO = CreateUserDTO.extend({
    role: z.enum(["admin", "user"]).optional().default("user"),
});

export const GoogleAuthDTO = z.object({
    idToken: z.string().min(1, "Google ID token is required"),
});
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTO>;

export const AdminUpdateUserDTO = UserSchema.pick({
    fullname: true,
    email: true,
    phoneNumber: true,
    gender: true,
    dateOfBirth: true,
    address: true,
    role: true,
}).partial().extend({
    password: optionalPasswordString,
});
