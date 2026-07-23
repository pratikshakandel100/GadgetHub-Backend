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
    updatedAt: Date;
    // SHA-256 hash of the current OTP (never the raw code). Cleared the moment it's consumed.
    resetPasswordOTPHash?: string | null;
    resetPasswordOTPExpires?: Date | null;
    resetPasswordOTPAttempts?: number;
    // Short-lived, single-use token issued after a successful OTP verification; authorizes the final reset-password call.
    resetPasswordTokenHash?: string | null;
    resetPasswordTokenExpires?: Date | null;
    // Per-email throttling for forgot-password requests (cooldown + hourly cap).
    resetPasswordLastRequestAt?: Date | null;
    resetPasswordRequestWindowStart?: Date | null;
    resetPasswordRequestCount?: number;
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
        // Hidden by default (select: false) so reset-password data never leaks through normal find/login queries.
        resetPasswordOTPHash: { type: String, required: false, select: false, default: null },
        resetPasswordOTPExpires: { type: Date, required: false, select: false, default: null },
        resetPasswordOTPAttempts: { type: Number, required: false, select: false, default: 0 },
        resetPasswordTokenHash: { type: String, required: false, select: false, default: null },
        resetPasswordTokenExpires: { type: Date, required: false, select: false, default: null },
        resetPasswordLastRequestAt: { type: Date, required: false, select: false, default: null },
        resetPasswordRequestWindowStart: { type: Date, required: false, select: false, default: null },
        resetPasswordRequestCount: { type: Number, required: false, select: false, default: 0 },
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
