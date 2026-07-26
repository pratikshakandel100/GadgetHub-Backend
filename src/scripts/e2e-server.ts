/**
 * Bootstraps a throwaway backend instance for Playwright E2E runs: a fresh
 * in-memory MongoDB (never the real Atlas cluster) plus a dedicated port, so
 * E2E tests never touch production data or collide with a dev server that
 * might already be running on 8080.
 *
 * MONGODB_URI/PORT are set on process.env via dynamic import (not a static
 * top-level import, which would be hoisted above this code) so that
 * `../config/constant` — evaluated the moment `../app` is first imported —
 * picks up these values instead of falling back to the real .env.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
    const mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.PORT = process.env.E2E_BACKEND_PORT || "8081";
    process.env.BACKEND_URL = `http://127.0.0.1:${process.env.PORT}`;
    process.env.FRONTEND_URL = process.env.E2E_FRONTEND_URL || "http://127.0.0.1:3001";
    // Isolated escape hatch used only by EsewaService when this exact flag is
    // set (never in production/dev) — see the check in esewa.service.ts.
    process.env.ESEWA_TEST_MODE = "true";
    process.env.E2E_TEST_MODE = "true";
    // Dozens of tests each register/login at least once within one run — well past
    // the real 20-per-15-min login/register limiter, which would otherwise start
    // rejecting requests partway through the suite with unrelated 429s.
    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = "100000";

    const { connectToMongoDB } = await import("../database/mongodb");
    await connectToMongoDB();

    const { default: app } = await import("../app");
    const port = process.env.PORT;

    const server = app.listen(port, () => {
        console.log(`[e2e-server] backend ready on http://127.0.0.1:${port}`);
    });

    const shutdown = async () => {
        server.close();
        await mongod.stop();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((error) => {
    console.error("[e2e-server] failed to start", error);
    process.exit(1);
});
