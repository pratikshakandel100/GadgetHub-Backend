import mongoose, { Schema, Document } from "mongoose";

// Refresh tokens are stored hashed (never the raw value) so a database leak
// alone can't be used to impersonate a session. The raw token only ever
// exists in the response body / the client's httpOnly cookie.
export interface IRefreshToken extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RefreshTokenSchema: Schema = new Schema<IRefreshToken>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        revokedAt: { type: Date, required: false },
    },
    {
        timestamps: true,
    }
);

// Let MongoDB automatically drop expired refresh tokens instead of them
// piling up forever.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
