# BookStack MCP Server — Sunnyside School District Fork

This is a fork of [pnocera/bookstack-mcp-server](https://github.com/pnocera/bookstack-mcp-server) customized for **Sunnyside School District IT Operations**.

It extends the original 47-tool base with **25 additional tools**, **9 additional resources**, infrastructure hardening, and a full unit test suite.

---

## What This Fork Adds

### Tag Management Tools (4)

Purpose-built for the SSD IT Operations tag taxonomy:

| Tool | Description |
|------|-------------|
| `bookstack_tags_search` | Search content by tag name/value using correct `tag:Name=Value` query syntax |
| `bookstack_tags_list_all` | Enumerate every unique tag in use across all content, with usage counts |
| `bookstack_tags_audit` | Coverage report showing which items are untagged or missing required tags |
| `bookstack_tags_bulk_update` | Safely add, update, or remove a tag across many items at once (read-before-write, dry-run support) |

### Utility Tools (5)

| Tool | Description |
|------|-------------|
| `bookstack_templates_list` | List all pages marked as templates, optionally scoped to a specific book |
| `bookstack_content_path` | Walk hierarchy upward from a page or chapter and return the full breadcrumb trail (page → chapter → book) |
| `bookstack_content_summarize` | Compact structural summary of a book or chapter — names, descriptions, tags, and counts without fetching full page HTML |
| `bookstack_audit_log_summary` | Aggregate audit log entries into event-type counts, per-entity counts, and top-10 active users over a date range |
| `bookstack_ratelimit_status` | Show current token-bucket state (available tokens, refill rate, estimated wait) before starting bulk operations |

### Batch Tools (1)

| Tool | Description |
|------|-------------|
| `bookstack_batch_create_content` | Create up to 50 pages and/or chapters in one call with per-item error reporting |

### Permissions Audit Tool (1)

| Tool | Description |
|------|-------------|
| `bookstack_permissions_audit` | Scan content items and report which have non-inheriting custom permission overrides — useful for security audits |

### Additional Resource Providers (6 URIs — 3 new types)

| Resource URIs | Description |
|---|---|
| `bookstack://roles`, `bookstack://roles/{id}` | Role definitions and permission strings |
| `bookstack://attachments`, `bookstack://attachments/{id}` | File/link attachments with download links |
| `bookstack://images`, `bookstack://images/{id}` | Image gallery with embed URLs |

All existing resource providers (books, pages, chapters, shelves, users, search) have also been enriched with schema, examples, and access pattern documentation.

### Infrastructure Improvements

- **Exponential backoff retry** — HTTP 429 and 5xx errors are automatically retried up to 3 times (100 ms → 200 ms → 400 ms) before surfacing to the caller
- **GET request deduplication** — concurrent identical GET calls share a single in-flight Promise instead of each making a separate API round-trip
- **Pagination fix** — `fetchAllPages` now requests only the remaining items needed per page, preventing wasted API calls on large scans
- **Stronger type safety** — `instanceof AxiosError` check replaces loose property check; `RecycleBinItem.deletable` typed as a proper union

### Validator Schema Fixes

- `userCreate` now includes `external_auth_id` (LDAP/SAML users)
- `contentPermissionsUpdate` now accepts `user_id` as an alternative to `role_id`, with a refinement ensuring at least one is provided
- Export handlers (`books`, `pages`, `chapters`) validate `format` through the Zod schema before the API call

### Unit Test Suite

Four new test files covering previously untested code:

| File | What it tests |
|---|---|
| `tests/unit/tags.test.ts` | All 4 TagTools including pagination edge cases and dry-run |
| `tests/unit/validator.test.ts` | Schema defaults, invalid values, new fields |
| `tests/unit/errors.test.ts` | All HTTP→MCP error code mappings |
| `tests/unit/rateLimit.test.ts` | Burst allowance and throttle behaviour |

---

## Tool Count Summary

| Category | Tools |
|---|---|
| Books | 6 (list, create, read, update, delete, export) |
| Pages | 6 (list, create, read, update, delete, export) |
| Chapters | 6 (list, create, read, update, delete, export) |
| Shelves | 5 (list, create, read, update, delete) |
| Users | 5 (list, create, read, update, delete) |
| Roles | 5 (list, create, read, update, delete) |
| Attachments | 5 (list, create, read, update, delete) |
| Images | 5 (list, create, read, update, delete) |
| Search | 1 |
| Recycle Bin | 3 (list, restore, permanently delete) |
| Permissions | 3 (read, update, **audit**) |
| Audit Log | 1 (list) + **1 summary** |
| System | 1 (info) |
| Server Info | 5 (info, categories, examples, errors, help) |
| **Tags (fork)** | **4** |
| **Utility (fork)** | **5** |
| **Batch (fork)** | **1** |
| **Total** | **72** |

---

## Setup

### 1. Clone and Build

```bash
git clone https://github.com/macsiah/bookstack-mcp-server.git
cd bookstack-mcp-server
npm install
npm run build
```

### 2. Configure Environment Variables

```bash
export BOOKSTACK_BASE_URL="https://bookstack.sunnysideschools.org/api"
export BOOKSTACK_API_TOKEN="your_token_id:your_token_secret"
```

> **Token format:** Combine your BookStack API Token ID and Token Secret with a colon: `token_id:token_secret`.
> Generate tokens at: BookStack → Your Profile → API Tokens

### 3. Register with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bookstack": {
      "command": "node",
      "args": ["/path/to/bookstack-mcp-server/dist/server.js"],
      "env": {
        "BOOKSTACK_BASE_URL": "https://bookstack.sunnysideschools.org/api",
        "BOOKSTACK_API_TOKEN": "your_token_id:your_token_secret"
      }
    }
  }
}
```

### Optional Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BOOKSTACK_TIMEOUT` | `30000` | HTTP timeout in ms |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `60` | API requests allowed per minute |
| `RATE_LIMIT_BURST_LIMIT` | `10` | Burst allowance above the per-minute rate |
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `LOG_FORMAT` | `pretty` | `pretty` or `json` |
| `VALIDATION_STRICT_MODE` | `false` | Fail (vs warn) on unknown parameters |

---

## SSD Tag Taxonomy

The tag tools are designed around this IT Operations taxonomy:

| Tag | Values |
|-----|--------|
| `Status` | Placeholder / Draft / Complete |
| `Priority` | Critical / High / Medium |
| `Content Type` | Procedure / Runbook / Reference / Registry / Guide / Index / Policy / Gap Register |
| `Audience` | IT Staff / All Staff / Administrators / HR Staff / Finance Staff / Teachers |
| `Review Cycle` | Annual / Biennial / Ongoing / Event-Driven |
| `Compliance` | FERPA / State Reporting / Safety / Budget |
| `Division` | Instruction / Operations / Administration |

---

## Usage Examples

### Find all Placeholder pages
```
bookstack_tags_search({ tag_name: "Status", tag_value: "Placeholder", content_type: "page" })
```

### Audit books for missing required tags
```
bookstack_tags_audit({
  content_type: "book",
  required_tag_names: ["Content Type", "Audience", "Review Cycle"]
})
```

### See every tag currently in use
```
bookstack_tags_list_all({ content_type: "all" })
```

### Add a tag to a set of books (preview first, then apply)
```
bookstack_tags_bulk_update({
  content_type: "book",
  operation: "set",
  tag_name: "Status",
  tag_value: "Draft",
  item_ids: [42, 47, 53],
  dry_run: true   ← preview
})
```

> **Important:** `bookstack_tags_bulk_update` always reads each item's existing tags before writing so no other tags are lost. Use `dry_run: true` to preview any bulk change before applying it.

### Understand a book's structure before editing
```
bookstack_content_summarize({ content_type: "book", content_id: 5 })
```

### Create several pages at once
```
bookstack_batch_create_content({
  items: [
    { type: "chapter", name: "Getting Started", book_id: 1 },
    { type: "page", name: "Installation", chapter_id: 10, markdown: "## Install\n..." },
    { type: "page", name: "Configuration", chapter_id: 10, markdown: "## Config\n..." }
  ]
})
```

### Check what changed last week
```
bookstack_audit_log_summary({ date_from: "2026-03-12", date_to: "2026-03-19" })
```

### Find content with custom permissions
```
bookstack_permissions_audit({ content_types: ["book", "bookshelf"] })
```

### Check rate limiter before a large batch
```
bookstack_ratelimit_status({})
```

### Find a page's place in the hierarchy
```
bookstack_content_path({ content_type: "page", content_id: 123 })
```

---

## Development

```bash
npm run build          # Compile TypeScript → dist/
npm test               # Run Jest unit tests (40 tests)
npm run test:coverage  # Coverage report → coverage/
npm run dev            # ts-node (no compile step)
npm run watch          # nodemon + ts-node (auto-restart)
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier
```

---

## Keeping This Fork in Sync with Upstream

```bash
# Add the upstream remote (one-time setup)
git remote add upstream https://github.com/pnocera/bookstack-mcp-server.git

# Pull upstream changes
git fetch upstream
git merge upstream/main

# Rebuild after merging
npm run build
```

> **Important:** When merging upstream, preserve `src/tools/tags.ts`, `src/tools/utility.ts`, `src/tools/batch.ts`, and their registrations in `src/server.ts`. These are fork-specific and should not be removed.

---

## Original Project

This fork is based on [pnocera/bookstack-mcp-server](https://github.com/pnocera/bookstack-mcp-server).
