import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "../config/constant";

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
    if (!transporter) {
        // No SMTP configured (e.g. local dev) — surface the link in the
        // server log instead of failing the request outright.
        console.warn(`[email] SMTP not configured — password reset link for ${to}: ${resetUrl}`);
        return;
    }

    await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: "Reset your GadgetHub password",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #0f172a;">Reset your password</h2>
                <p style="color: #475569;">We received a request to reset your GadgetHub password. This link expires in 10 minutes.</p>
                <p style="margin: 24px 0;">
                    <a href="${resetUrl}" style="background: #06b6d4; color: #0f172a; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">Reset Password</a>
                </p>
                <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    });
};
