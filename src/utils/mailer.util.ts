import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } from "../config/constant";

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendPasswordResetOtpEmail(to: string, fullname: string, otp: string): Promise<void> {
    if (!SMTP_USER || !SMTP_PASS) {
        // Never log the code itself, even in development — dev logs get committed by accident.
        console.warn("[mailer] SMTP not configured — password reset email was not sent");
        return;
    }

    await transporter.sendMail({
        from: `"GadgetHub" <${EMAIL_FROM}>`,
        to,
        subject: "Reset your GadgetHub password",
        text: `Hello ${fullname},\n\nYour verification code is ${otp}\n\nThis OTP expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\nTeam GadgetHub`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #0891b2;">Reset your GadgetHub password</h2>
                <p>Hello ${fullname},</p>
                <p>Your verification code is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0e7490;">${otp}</p>
                <p>This OTP expires in <strong>10 minutes</strong>.</p>
                <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
                <p style="color: #64748b; font-size: 13px;">Team GadgetHub</p>
            </div>
        `,
    });
}
