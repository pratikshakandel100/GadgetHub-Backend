// Stub for the real "meilisearch" package (ESM-only, which Jest's CJS
// transform can't parse). MEILISEARCH_HOST is unset in the integration test
// environment, so ProductSearchService never actually constructs or calls
// this client — it only needs to exist so the import doesn't blow up.
class Meilisearch {
  index() {
    return {
      search: async () => ({ hits: [] }),
      addDocuments: async () => ({}),
      deleteDocument: async () => ({}),
      updateSettings: async () => ({}),
    };
  }
}

module.exports = { Meilisearch };
