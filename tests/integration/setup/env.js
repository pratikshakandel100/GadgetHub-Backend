// Runs before any test file imports the app. The developer's real .env sets
// MEILISEARCH_HOST for local dev, which would otherwise route product search
// through the (stubbed) Meilisearch client instead of exercising the real
// MongoDB fallback these tests are meant to cover. dotenv.config() never
// overwrites a variable that's already set, so setting it empty here first
// guarantees search always falls back to MongoDB during this test run.
process.env.MEILISEARCH_HOST = "";
