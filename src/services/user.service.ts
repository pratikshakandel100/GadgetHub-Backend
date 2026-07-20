import { UserMongoRepository } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO, UpdateUserDTO } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bycryptjs from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { SECRET_KEY, GOOGLE_CLIENT_ID } from "../config/constant";

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
    
 }
