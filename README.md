# BookStack MCP Server — Sunnyside School District Fork

This is a fork of [pnocera/bookstack-mcp-server](https://github.com/pnocera/bookstack-mcp-server) customized for **Sunnyside School District IT Operations**.

It adds 4 tag management tools (51 tools total) on top of the original 47, enabling tag-filtered search, tag auditing, and bulk tag operations — capabilities the original server does not include.

---

## What This Fork Adds

### New Tag Management Tools

| Tool | Description |
|------|-------------|
| `bookstack_tags_search` | Search content by tag name/value using correct `tag:Name=Value` query syntax |
| `bookstack_tags_list_all` | Enumerate every unique tag in use across all content, with usage counts |
| `bookstack_tags_audit` | Coverage report showing which items are untagged or missing required tags |
| `bookstack_tags_bulk_update` | Safely add, update, or remove a tag across many items at once (read-before-write) |

### Why These Tools Exist

BookStack's search API supports a `tag:Name=Value` filter syntax, but the standard search tool does not reliably produce results when tag expressions are passed through the query parameter. These tools construct tag queries directly and expose them as first-class operations, supporting the SSD IT Operations tag taxonomy:

| Tag | Purpose |
|-----|---------|
| `Status` | Placeholder / Draft / Complete |
| `Priority` | Critical / High / Medium |
| `Content Type` | Procedure / Runbook / Reference / Registry / Guide / Index / Policy / Gap Register |
| `Audience` | IT Staff / All Staff / Administrators / HR Staff / Finance Staff / Teachers |
| `Review Cycle` | Annual / Biennial / Ongoing / Event-Driven |
| `Compliance` | FERPA / State Reporting / Safety / Budget |
| `Division` | Instruction / Operations / Administration |

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

---

## Using the Tag Tools

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

### Add a tag to a set of books (preview first)
```
bookstack_tags_bulk_update({
  content_type: "book",
  operation: "set",
  tag_name: "Status",
  tag_value: "Draft",
  item_ids: [42, 47, 53],
  dry_run: true
})
```

> **Important:** `bookstack_tags_bulk_update` always reads each item's existing tags before writing, so no other tags are overwritten. Use `dry_run: true` to preview any bulk change before applying it.

---

## All Available Tools (51 total)

**Original tools (47):** Full CRUD for books, pages, chapters, shelves, users, roles, attachments, images, search, recycle bin, permissions, audit log, and system info.

**Added in this fork (4):** `bookstack_tags_search`, `bookstack_tags_list_all`, `bookstack_tags_audit`, `bookstack_tags_bulk_update`

---

## Keeping This Fork in Sync with Upstream

If the original project releases updates you want to bring in:

```bash
# Add the upstream remote (one-time setup)
git remote add upstream https://github.com/pnocera/bookstack-mcp-server.git

# Pull upstream changes into your fork
git fetch upstream
git merge upstream/main

# Rebuild after merging
npm run build
```

---

## Original Project

This fork is based on [pnocera/bookstack-mcp-server](https://github.com/pnocera/bookstack-mcp-server). See the original project for full documentation on the base 47 tools and configuration options.
