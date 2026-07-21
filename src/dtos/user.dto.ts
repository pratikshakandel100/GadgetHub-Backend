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

export const RefreshTokenDTO = z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
});
export type RefreshTokenDTO = z.infer<typeof RefreshTokenDTO>;

export const LogoutDTO = z.object({
    refreshToken: z.string().optional(),
});
export type LogoutDTO = z.infer<typeof LogoutDTO>;

export const ForgotPasswordDTO = z.object({
    email: z.email("Invalid email address"),
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTO>;

export const ResetPasswordDTO = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTO>;

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
