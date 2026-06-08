import { UserMongoRepository } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bycryptjs from "bcrypt";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config/constant";
import { email } from "zod";

const userRepository = new UserMongoRepository();
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
       const isPasswordValid = await bycryptjs.compare(
        loginData.password,
        user.password
       )
       if(!isPasswordValid){
        throw new HttpException(400, "Sorry! Invalid Password");
       }

       const token = jwt.sign({id: user._id, email: user.email}, SECRET_KEY, {expiresIn: "30d"});
       return {user,token};
    }
 }