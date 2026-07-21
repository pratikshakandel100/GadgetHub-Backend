import { UserMongoRepository } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO, UpdateUserDTO } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bycryptjs from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_ID, FRONTEND_URL, ACCOUNT_LOCKOUT_MAX_ATTEMPTS, ACCOUNT_LOCKOUT_MINUTES, PASSWORD_RESET_EXPIRES_MINUTES } from "../config/constant";
import {
    issueTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokensForUser,
    findActiveRefreshToken,
    generateRawToken,
    hashRawToken,
} from "../utils/token.util";
import { sendPasswordResetEmail } from "../utils/email.util";

const userRepository = new UserMongoRepository();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
 export class UserService{
    async createUser(userData: CreateUserDTO): Promise<IUser>{
        const existingEmail = await userRepository.findByEmail(userData.email);
        if(existingEmail){
            throw new HttpException(400, "Email already exists")
        }
        const hashP = await bycryptjs.hash(userData.password,10);
        userData.password = hashP;
        const user = await userRepository.createUser(userData);
        return user;
    }

    async loginUser(loginData: LoginUserDTO){
        const user = await userRepository.findByEmail(loginData.email)
        if(!user){
            throw new HttpException(400, "Sorry! Invalid email");
        };
       if(!user.password){
        throw new HttpException(400, "This account uses Google Sign-In. Please continue with Google.");
       }

       if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
           const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
           throw new HttpException(423, `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`);
       }

       const isPasswordValid = await bycryptjs.compare(
        loginData.password,
        user.password
       )
       if(!isPasswordValid){
        const failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
        const lockingNow = failedLoginAttempts >= ACCOUNT_LOCKOUT_MAX_ATTEMPTS;
        await userRepository.update(user._id.toString(), {
            failedLoginAttempts: lockingNow ? 0 : failedLoginAttempts,
            lockUntil: lockingNow ? new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000) : (null as unknown as Date),
        });
        if (lockingNow) {
            throw new HttpException(423, `Too many failed attempts. Account locked for ${ACCOUNT_LOCKOUT_MINUTES} minutes.`);
        }
        throw new HttpException(400, "Sorry! Invalid Password");
       }

       if (user.failedLoginAttempts) {
           await userRepository.update(user._id.toString(), { failedLoginAttempts: 0, lockUntil: null as unknown as Date });
           user.failedLoginAttempts = 0;
       }

       const { accessToken, refreshToken } = await issueTokenPair(user);
       return { user, accessToken, refreshToken };
    }

    async googleLogin(idToken: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
        if (!GOOGLE_CLIENT_ID) {
            throw new HttpException(500, "Google Sign-In is not configured");
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
            payload = ticket.getPayload();
        } catch {
            throw new HttpException(401, "Invalid Google token");
        }

        if (!payload?.email || !payload.email_verified) {
            throw new HttpException(400, "Google account has no verified email");
        }

        let user = await userRepository.findByEmail(payload.email);
        if (!user) {
            user = await userRepository.createGoogleUser({
                fullname: payload.name || payload.email.split("@")[0],
                email: payload.email,
                googleId: payload.sub,
                profileImage: payload.picture,
            });
        } else if (!user.googleId) {
            // Existing email/password account signing in with Google for the first time — link it.
            user = (await userRepository.update(user._id.toString(), { googleId: payload.sub })) ?? user;
        }

        const { accessToken, refreshToken } = await issueTokenPair(user);
        return { user, accessToken, refreshToken };
    }

    async refreshAccessToken(rawRefreshToken: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
        const existing = await findActiveRefreshToken(rawRefreshToken);
        if (!existing) {
            throw new HttpException(401, "Session expired. Please log in again.");
        }
        const user = await userRepository.findById(existing.user.toString());
        if (!user) {
            throw new HttpException(401, "Session expired. Please log in again.");
        }
        const rotated = await rotateRefreshToken(rawRefreshToken, user);
        if (!rotated) {
            throw new HttpException(401, "Session expired. Please log in again.");
        }
        return { user, ...rotated };
    }

    async logoutUser(rawRefreshToken?: string): Promise<void> {
        if (rawRefreshToken) {
            await revokeRefreshToken(rawRefreshToken);
        }
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await userRepository.findByEmail(email);
        // Always behave the same whether or not the account exists, so this
        // endpoint can't be used to enumerate registered emails.
        if (!user || !user.password) {
            return;
        }

        const rawToken = generateRawToken();
        await userRepository.update(user._id.toString(), {
            resetPasswordTokenHash: hashRawToken(rawToken),
            resetPasswordExpires: new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000),
        });

        const resetUrl = `${FRONTEND_URL}/user/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(user.email, resetUrl);
    }

    async resetPassword(rawToken: string, newPassword: string): Promise<void> {
        const user = await userRepository.findByResetTokenHash(hashRawToken(rawToken));
        if (!user) {
            throw new HttpException(400, "This reset link is invalid or has expired");
        }

        const hashedPassword = await bycryptjs.hash(newPassword, 10);
        await userRepository.update(user._id.toString(), {
            password: hashedPassword,
            resetPasswordTokenHash: null as unknown as string,
            resetPasswordExpires: null as unknown as Date,
            failedLoginAttempts: 0,
            lockUntil: null as unknown as Date,
        });

        // A password reset means any stolen session should stop working too.
        await revokeAllRefreshTokensForUser(user._id.toString());
    }

    async updateUser(id: string, userData: UpdateUserDTO): Promise<IUser> {
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            throw new HttpException(404, "User not found");
        }
        const { currentPassword, ...updateData } = userData;
        
        console.log("Update data received:", updateData);
        console.log("Current password provided:", !!currentPassword);

        if (updateData.email && updateData.email !== existingUser.email) {
            const existingEmail = await userRepository.findByEmail(updateData.email);
            if (existingEmail) {
                throw new HttpException(400, "Email already exists");
            }
        }
        if (updateData.fullname && updateData.fullname !== existingUser.fullname) {
            const existingUsername = await userRepository.getUserByUsername(updateData.fullname);
            if (existingUsername) {
                throw new HttpException(400, "Full name already exists");
            }
        }
        if (updateData.password) {
            console.log("Password update requested");
            if (!currentPassword) {
                throw new HttpException(400, "Current password is required");
            }
            const isCurrentPasswordValid = await bycryptjs.compare(
                currentPassword,
                existingUser.password
            );
            if (!isCurrentPasswordValid) {
                throw new HttpException(400, "Current password is incorrect");
            }
            const hashedPassword = await bycryptjs.hash(updateData.password, 10);
            updateData.password = hashedPassword;
            console.log("Password hashed and updated");
        }
        
        console.log("Final update data:", { ...updateData, password: updateData.password ? "***hashed***" : undefined });
        const updatedUser = await userRepository.update(id, updateData as Partial<IUser>);
        if (!updatedUser) {
            throw new HttpException(500, "Failed to update user");
        }
        return updatedUser;
    }


    async getAllUsers(
    page: number,
    limit: number,
    search: string
): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {

    const result = await userRepository.getAll(
        page,
        limit,
        search
    );

    return result;
}

    async deleteUser(id: string): Promise<void> {
    // 1. First, check if the user actually exists in our database
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
        throw new HttpException(404, "User not found");
    }
    
    // 3. Delete the user from the repository
    const isDeleted = await userRepository.delete(id);
    if (!isDeleted) {
        throw new HttpException(500, "Failed to delete user");
    }
}

async getUserById(id: string): Promise<IUser> {
    
    const user = await userRepository.findUserById(id);

    if (!user) {
        throw new HttpException(404,"User not found");
    }

    return user;
}

async createUserByAdmin(
    userData: CreateUserDTO & { role?: "admin" | "user" }
): Promise<IUser> {

    const existingEmail = await userRepository.findByEmail(userData.email);

    if(existingEmail){
        throw new HttpException(400,"Email already exists");
    }

    const hashPassword = await bycryptjs.hash(
        userData.password,
        10
    );

    userData.password = hashPassword;

    return await userRepository.createUserByAdmin(userData);
}

async updateUserByAdmin(
    id:string,
    userData:Partial<IUser>
):Promise<IUser>{

    const existingUser = await userRepository.findById(id);

    if(!existingUser){
        throw new HttpException(404,"User not found");
    }

    if(userData.password){

        userData.password = await bycryptjs.hash(
            userData.password,
            10
        );

    }

    const updated = await userRepository.updateUserByAdmin(
        id,
        userData
    );

    if(!updated){
        throw new HttpException(
            500,
            "Failed to update user"
        );
    }

    return updated;
}
    
 }
