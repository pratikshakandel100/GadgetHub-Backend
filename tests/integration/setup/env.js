// Runs before any test file imports the app. The developer's real .env sets
// MEILISEARCH_HOST for local dev, which would otherwise route product search
// through the (stubbed) Meilisearch client instead of exercising the real
// MongoDB fallback these tests are meant to cover. dotenv.config() never
// overwrites a variable that's already set, so setting it empty here first
// guarantees search always falls back to MongoDB during this test run.
process.env.MEILISEARCH_HOST = "";

// The AI chat route short-circuits with a 500 ("AI assistant is not
// configured") unless a key is present. The real Gemini client is mocked at
// the module level wherever it's actually invoked, so the key's value here
// never matters — it only needs to be non-empty to pass that guard.
process.env.GEMINI_API_KEY = "test-gemini-key";
