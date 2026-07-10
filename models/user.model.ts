import mongoose, {Schema, Document} from "mongoose";
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
        phoneNumber: { type: String, required: false },
        profileImage: { type: String, required: false },
        gender: {
            type: String,
            enum: ["male", "female", "other", "prefer-not-to-say"],
            required: false
        },
        dateOfBirth: { type: String, required: false },
        address: { type: String, required: false },
        role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
    required: true
},
    },
    {
        timestamps: true
    }
)

export default mongoose.model<IUser>(
    "User", // collection name in db.users
    UserMongoSchema
);
