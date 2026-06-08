import { CreateUserDTO } from "../dtos/user.dto";
import User, { IUser } from "../models/user.model";


export interface IUserRepository{
    findByEmail(email: string): Promise<IUser|null>;
    createUser(user: CreateUserDTO): Promise<IUser>;
    findById(id: string): Promise<IUser | null>;
    getAll(): Promise<IUser[]>;
    update(id: string, user: Partial<IUser>): Promise<IUser | null>;
    delete(id: string): Promise<boolean>;
}

export class UserMongoRepository implements IUserRepository{
    async findByEmail(email: string): Promise<IUser | null> {
        const foundUser = await User.findOne({email});
        return foundUser;
    }
    async createUser(user: CreateUserDTO): Promise<IUser> {
       const createdUser = await User.create(user);
       return createdUser;
    }
    async findById(id: string): Promise<IUser|null> {
        const foundUser = await User.findById(id);
        return foundUser;
    }
    async getAll(): Promise<IUser[]> {
        const found = await User.find();
        return found;
    }
    async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
        const updated = await User.findByIdAndUpdate(id, user, {new:true})
        return updated;
    }
    async delete(id: string): Promise<boolean> {
        const deleted = await User.findByIdAndDelete(id);
        return !!deleted;
    }

}