import { CreateUserDTO } from "../dtos/user.dto";
import User, { IUser } from "../models/user.model";

export interface IUserRepository {
    findByEmail(email: string): Promise<IUser|null>;
    createUser(user: CreateUserDTO): Promise<IUser>;
    findById(id: string): Promise<IUser | null>;
    getAll(
        page: number,
        limit: number,
        search: string
    ): Promise<{
        users: IUser[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>
    update(id: string, user: Partial<IUser>): Promise<IUser | null>;
    delete(id: string): Promise<boolean>;
    getUserByUsername(username: string): Promise<IUser | null>;


    findUserById(id: string): Promise<IUser | null>;

createUserByAdmin(user: CreateUserDTO): Promise<IUser>;

updateUserByAdmin(
    id: string,
    user: Partial<IUser>
): Promise<IUser | null>;
}

export class UserMongoRepository implements IUserRepository {
    async getUserByUsername(username: string): Promise<IUser | null> {
        const found = await User.findOne({ fullname: username });
        return found;
    }

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

    // Implementation of "Find All"
      async getAll(
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

    const skip = (page - 1) * limit;

    const filter = search
        ? {
              $or: [
                  {
                      fullname: {
                          $regex: search,
                          $options: "i",
                      },
                  },
                  {
                      email: {
                          $regex: search,
                          $options: "i",
                      },
                  },
              ],
          }
        : {};

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

    async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
        const filteredUser = Object.fromEntries(
            Object.entries(user).filter(([_, value]) => value !== undefined)
        );
        const updated = await User.findByIdAndUpdate(id, { $set: filteredUser }, { new: true, runValidators: true });
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await User.findByIdAndDelete(id);
        // "!!" converts the Mongoose document (or null) into a true/false boolean
        return !!deleted; 
    }


    async findUserById(id: string): Promise<IUser | null> {
    return await User.findById(id);
}

async createUserByAdmin(user: CreateUserDTO): Promise<IUser> {
    return await User.create(user);
}

async updateUserByAdmin(
    id: string,
    user: Partial<IUser>
): Promise<IUser | null> {

    return await User.findByIdAndUpdate(
        id,
        {
            $set: user
        },
        {
            new: true,
            runValidators: true
        }
    );
}
}