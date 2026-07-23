import { UserMongoRepository } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO, UpdateUserDTO, ForgotPasswordDTO, VerifyResetOtpDTO, ResetPasswordDTO } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bycryptjs from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { SECRET_KEY, GOOGLE_CLIENT_ID } from "../config/constant";
import { sendPasswordResetOtpEmail } from "../utils/mailer.util";

const userRepository = new UserMongoRepository();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const RESET_OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const RESET_REQUEST_HOURLY_CAP = 5;

// Same message for every forgot-password call, registered or not, rate-limited or not —
// otherwise the response itself becomes an oracle for which emails have accounts.
const FORGOT_PASSWORD_MESSAGE = "If an account exists for this email, a verification code has been sent.";
// One message for every verify/reset failure (missing, expired, wrong, locked-out) so a caller
// can't distinguish "no such code" from "wrong code" from "too many attempts".
const GENERIC_OTP_ERROR = "Invalid or expired verification code";
const GENERIC_RESET_TOKEN_ERROR = "Invalid or expired request. Please start again.";

const sha256 = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

// Constant-time compare so response timing can't leak how close a guess was.
// Always hashes a random dummy when the real hash is missing, so a "no OTP on file" branch
// costs the same as a real mismatch instead of returning early.
const safeCompareHash = (candidate: string, storedHash?: string | null): boolean => {
    const candidateHash = sha256(candidate);
    const target = storedHash ?? sha256(crypto.randomBytes(32).toString("hex"));
    const isEqual = crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(target, "hex"));
    return isEqual && !!storedHash;
};

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
       const isPasswordValid = await bycryptjs.compare(
        loginData.password,
        user.password
       )
       if(!isPasswordValid){
        throw new HttpException(400, "Sorry! Invalid Password");
       }

       const token = jwt.sign({id: user._id, email: user.email, role: user.role}, SECRET_KEY, {expiresIn: "30d"});
       return {user,token};
    }

    async googleLogin(idToken: string): Promise<{ user: IUser; token: string }> {
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

        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "30d" });
        return { user, token };
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

async forgotPassword(data: ForgotPasswordDTO): Promise<void> {
    const user = await userRepository.findByEmailWithResetFields(data.email);

    if (!user) {
        // Burn roughly the same time as the real path so response latency doesn't
        // reveal whether the address is registered.
        sha256(crypto.randomBytes(16).toString("hex"));
        return;
    }

    const now = new Date();
    const windowStart = user.resetPasswordRequestWindowStart ?? null;
    const withinWindow = !!windowStart && now.getTime() - windowStart.getTime() < RESET_REQUEST_WINDOW_MS;
    const requestCountInWindow = withinWindow ? (user.resetPasswordRequestCount ?? 0) : 0;
    const cooldownActive =
        !!user.resetPasswordLastRequestAt &&
        now.getTime() - user.resetPasswordLastRequestAt.getTime() < RESET_REQUEST_COOLDOWN_MS;

    // No password to reset (Google-only account), on cooldown, or over the hourly cap —
    // stay silent rather than surfacing any of that, and never touch the request counters.
    if (!user.password || cooldownActive || requestCountInWindow >= RESET_REQUEST_HOURLY_CAP) {
        return;
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = sha256(otp);

    await userRepository.update(user._id.toString(), {
        resetPasswordOTPHash: otpHash,
        resetPasswordOTPExpires: new Date(now.getTime() + RESET_OTP_EXPIRY_MS),
        resetPasswordOTPAttempts: 0,
        resetPasswordTokenHash: null,
        resetPasswordTokenExpires: null,
        resetPasswordLastRequestAt: now,
        resetPasswordRequestWindowStart: withinWindow ? windowStart : now,
        resetPasswordRequestCount: requestCountInWindow + 1,
    } as Partial<IUser>);

    try {
        await sendPasswordResetOtpEmail(user.email, user.fullname, otp);
    } catch (error) {
        // A mail-server failure must not surface as a different response than the generic
        // one above — that would leak exactly the kind of signal this endpoint is designed
        // to hide. Log server-side (never the OTP itself) and let the generic message stand.
        console.error("Failed to send password reset email", error);
    }
}

async verifyResetOtp(data: VerifyResetOtpDTO): Promise<{ resetToken: string }> {
    const user = await userRepository.findByEmailWithResetFields(data.email);

    if (!user) {
        safeCompareHash(data.otp, null);
        throw new HttpException(400, GENERIC_OTP_ERROR);
    }

    const expired = !user.resetPasswordOTPExpires || user.resetPasswordOTPExpires.getTime() < Date.now();
    const locked = (user.resetPasswordOTPAttempts ?? 0) >= RESET_OTP_MAX_ATTEMPTS;

    if (!user.resetPasswordOTPHash || expired || locked) {
        safeCompareHash(data.otp, null);
        throw new HttpException(400, GENERIC_OTP_ERROR);
    }

    const isValid = safeCompareHash(data.otp, user.resetPasswordOTPHash);
    if (!isValid) {
        await userRepository.update(user._id.toString(), {
            resetPasswordOTPAttempts: (user.resetPasswordOTPAttempts ?? 0) + 1,
        } as Partial<IUser>);
        throw new HttpException(400, GENERIC_OTP_ERROR);
    }

    // Single-use: the OTP is consumed the instant it's verified. A fresh, short-lived
    // token — unrelated to the OTP — authorizes the actual password change that follows.
    const resetToken = crypto.randomBytes(32).toString("hex");
    await userRepository.update(user._id.toString(), {
        resetPasswordOTPHash: null,
        resetPasswordOTPExpires: null,
        resetPasswordOTPAttempts: 0,
        resetPasswordTokenHash: sha256(resetToken),
        resetPasswordTokenExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    } as Partial<IUser>);

    return { resetToken };
}

async resetPassword(data: ResetPasswordDTO): Promise<void> {
    const user = await userRepository.findByEmailWithResetFields(data.email);

    if (!user) {
        safeCompareHash(data.resetToken, null);
        throw new HttpException(400, GENERIC_RESET_TOKEN_ERROR);
    }

    const expired = !user.resetPasswordTokenExpires || user.resetPasswordTokenExpires.getTime() < Date.now();
    if (!user.resetPasswordTokenHash || expired) {
        safeCompareHash(data.resetToken, null);
        throw new HttpException(400, GENERIC_RESET_TOKEN_ERROR);
    }

    const isValid = safeCompareHash(data.resetToken, user.resetPasswordTokenHash);
    if (!isValid) {
        throw new HttpException(400, GENERIC_RESET_TOKEN_ERROR);
    }

    // The account password itself is a long-lived secret, so bcrypt's deliberate slowness
    // is worth paying for here — unlike the short-lived, high-entropy OTP/reset token above.
    const hashedPassword = await bycryptjs.hash(data.password, 10);
    await userRepository.update(user._id.toString(), {
        password: hashedPassword,
        resetPasswordTokenHash: null,
        resetPasswordTokenExpires: null,
    } as Partial<IUser>);
}

 }
