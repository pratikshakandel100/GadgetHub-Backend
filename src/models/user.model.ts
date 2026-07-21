import mongoose, {Schema, Document} from "mongoose";
import { UserType } from "../types/user.type";

//Document comes from Mongoose is adds MongoDB document methods and properties like user.save(), user.deleteOne like this
export  interface IUser extends UserType, Document {
    _id: mongoose.Types.ObjectId;
    failedLoginAttempts: number;
    lockUntil?: Date;
    resetPasswordTokenHash?: string;
    resetPasswordExpires?: Date;
    createdAt: Date;
    updatedAt: Date
}

const UserMongoSchema: Schema = new Schema<IUser>(
    {
        fullname: { type: String, required: true},
        email: {type: String, required: true, unique: true},
        // Not required at the schema level: Google-authenticated users have no password.
        // CreateUserDTO still requires it for normal email/password registration.
        password: {type: String, required: false},
        googleId: { type: String, required: false, unique: true, sparse: true },
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
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, required: false },
        resetPasswordTokenHash: { type: String, required: false },
        resetPasswordExpires: { type: Date, required: false },
    },
    {
        timestamps: true
    }
)

export default mongoose.model<IUser>(
    "User", // collection name in db.users
    UserMongoSchema
);
