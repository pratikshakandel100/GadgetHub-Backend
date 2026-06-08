import mongoose, {Schema, Document} from "mongoose";
import { isInternalThread } from "node:worker_threads";
import { UserType } from "../types/user.type";

//Document comes from Mongoose is adds MongoDB document methods and properties like user.save(), user.deleteOne like this
export  interface IUser extends UserType, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date
}

const UserMongoSchema: Schema = new Schema<IUser>(
    {
        fullname: { type: String, required: true},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true},
       
    },
    {
        timestamps: true
    }
)

export default mongoose.model<IUser>(
    "User", // collection name in db.users
    UserMongoSchema
);