// Test-only routes for the Playwright E2E harness. Mounted in app.ts ONLY
// when process.env.E2E_TEST_MODE === "true" (set exclusively by
// src/scripts/e2e-server.ts) — never reachable in dev or production.
// Exists because Playwright's test process can't create an admin user any
// other way: the public /auth/register endpoint always defaults role to
// "user", and the E2E backend's in-memory database isn't reachable from the
// test runner process to seed one directly.
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { SECRET_KEY } from "../config/constant";
import { e2eOtpInbox } from "../utils/mailer.util";

const e2eTestRouter = Router();

e2eTestRouter.get("/last-otp", (req, res) => {
    const email = req.query.email as string;
    const otp = e2eOtpInbox.get(email);
    if (!otp) {
        return res.status(404).json({ success: false, message: "No OTP captured for this email", data: null });
    }
    res.json({ success: true, data: { otp } });
});

e2eTestRouter.post("/admin", async (req, res) => {
    const email = req.body.email || `e2e-admin-${Date.now()}@example.com`;
    const password = req.body.password || "AdminPass123";

    let user = await User.findOne({ email });
    if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({ fullname: "E2E Admin", email, password: hashedPassword, role: "admin" });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "30d" });
    res.json({ success: true, data: { token, user: { _id: user._id, email: user.email, role: user.role } } });
});

export default e2eTestRouter;
