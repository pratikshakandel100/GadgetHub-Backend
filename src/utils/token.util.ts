import crypto from "crypto";
import jwt from "jsonwebtoken";
import RefreshToken from "../models/refresh-token.model";
import { IUser } from "../models/user.model";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_DAYS, SECRET_KEY } from "../config/constant";

export const signAccessToken = (user: Pick<IUser, "_id" | "email" | "role">): string =>
    jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

const hashToken = (rawToken: string): string =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

/** Issues a fresh access + refresh token pair, persisting the refresh token (hashed). */
export const issueTokenPair = async (user: Pick<IUser, "_id" | "email" | "role">) => {
    const accessToken = signAccessToken(user);

    const refreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ user: user._id, tokenHash: hashToken(refreshToken), expiresAt });

    return { accessToken, refreshToken };
};

/**
 * Validates a raw refresh token and rotates it: the old one is revoked and a
 * new pair is issued. Returns null if the token is missing, expired, or
 * already revoked (e.g. reused after logout/rotation — treated as invalid).
 */
export const rotateRefreshToken = async (rawRefreshToken: string, user: Pick<IUser, "_id" | "email" | "role">) => {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await RefreshToken.findOne({ tokenHash, user: user._id });
    if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
        return null;
    }

    existing.revokedAt = new Date();
    await existing.save();

    return issueTokenPair(user);
};

export const findActiveRefreshToken = async (rawRefreshToken: string) => {
    const tokenHash = hashToken(rawRefreshToken);
    return RefreshToken.findOne({ tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
};

export const revokeRefreshToken = async (rawRefreshToken: string) => {
    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.updateOne({ tokenHash, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
};

export const revokeAllRefreshTokensForUser = async (userId: string) => {
    await RefreshToken.updateMany(
        { user: userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
    );
};

export const generateRawToken = () => crypto.randomBytes(32).toString("hex");
export const hashRawToken = hashToken;
