"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagTools = void 0;
const TYPE_SEARCH_FILTERS = {
    page: '[page]',
    book: '[book]',
    chapter: '[chapter]',
    bookshelf: '[bookshelf]',
};
class TagTools {
    constructor(client, validator, logger) {
        this.client = client;
        this.validator = validator;
        this.logger = logger;
    }
    getTools() {
        return [
            this.createTagSearchTool(),
            this.createTagListAllTool(),
            this.createTagAuditTool(),
            this.createTagBulkUpdateTool(),
        ];
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    /** Paginate through a list endpoint and return all items up to maxItems. */
    async fetchAllPages(listFn, maxItems = 500) {
        const items = [];
        let offset = 0;
        const pageSize = 100;
        while (items.length < maxItems) {
            const remaining = maxItems - items.length;
            const count = Math.min(pageSize, remaining);
            const data = await listFn({ count, offset });
            const batch = data.data || [];
            items.push(...batch);
            // Stop if: we got fewer items than requested (last page), nothing came back,
            // or we've now collected everything the server has.
            if (batch.length < count || batch.length === 0 || items.length >= (data.total ?? Infinity)) {
                break;
            }
            offset += batch.length;
        }
        return items;
    }
    /** Pure function: apply a tag operation to a tag list. */
    applyTagOperation(tags, operation, name, value) {
        if (operation === 'remove') {
            return tags.filter(t => t.name !== name);
        }
        const existingNames = new Set(tags.map(t => t.name));
        if (operation === 'add') {
            if (existingNames.has(name))
                return tags; // already present — skip
            return [...tags, { name, value: value ?? '' }];
        }
        // 'set': add or overwrite
        if (existingNames.has(name)) {
            return tags.map(t => (t.name === name ? { name, value: value ?? '' } : t));
        }
        return [...tags, { name, value: value ?? '' }];
    }
    /** Return the list method for a given content type. */
    getListFn(ct) {
        switch (ct) {
            case 'book': return (p) => this.client.listBooks(p);
            case 'page': return (p) => this.client.listPages(p);
            case 'chapter': return (p) => this.client.listChapters(p);
            case 'bookshelf': return (p) => this.client.listShelves(p);
        }
    }
    /** Return the get-by-id method for a given content type. */
    getGetFn(ct) {
        switch (ct) {
            case 'book': return (id) => this.client.getBook(id);
            case 'page': return (id) => this.client.getPage(id);
            case 'chapter': return (id) => this.client.getChapter(id);
            case 'bookshelf': return (id) => this.client.getShelf(id);
        }
    }
    /** Return the update method for a given content type. */
    getUpdateFn(ct) {
        switch (ct) {
            case 'book': return (id, data) => this.client.updateBook(id, data);
            case 'page': return (id, data) => this.client.updatePage(id, data);
            case 'chapter': return (id, data) => this.client.updateChapter(id, data);
            case 'bookshelf': return (id, data) => this.client.updateShelf(id, data);
        }
    }
    // ---------------------------------------------------------------------------
    // Tool 1: bookstack_tags_search
    // ---------------------------------------------------------------------------
    createTagSearchTool() {
        return {
            name: 'bookstack_tags_search',
            description: 'Search BookStack content by tag name and optional value. ' +
                'Use this instead of bookstack_search for tag filtering — it explicitly ' +
                'constructs the tag:Name=Value query syntax and returns matched items with their tags. ' +
                'Examples: find all Placeholder pages, all Critical-priority books, all FERPA-tagged content.',
            inputSchema: {
                type: 'object',
                required: ['tag_name'],
                properties: {
                    tag_name: {
                        type: 'string',
                        minLength: 1,
                        description: "Tag name to filter by (e.g. 'Status', 'Priority', 'Compliance', 'Audience')",
                    },
                    tag_value: {
                        type: 'string',
                        description: "Tag value to match (e.g. 'Placeholder', 'Critical', 'FERPA'). " +
                            'Omit to match any value of this tag name.',
                    },
                    content_type: {
                        type: 'string',
                        enum: ['all', 'page', 'book', 'chapter', 'bookshelf'],
                        default: 'all',
                        description: "Content type to search. Use 'all' to search across every type.",
                    },
                    count: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 20,
                        description: 'Results per page (1–100)',
                    },
                    page: {
                        type: 'integer',
                        minimum: 1,
                        default: 1,
                        description: 'Page number for pagination',
                    },
                },
            },
            handler: async (params) => {
                const tagName = params.tag_name;
                const tagValue = params.tag_value;
                const contentType = params.content_type ?? 'all';
                const count = params.count ?? 20;
                const pageNum = params.page ?? 1;
                // Build BookStack search query: [type] tag:Name=Value
                const tagFilter = tagValue !== undefined
                    ? `tag:${tagName}=${tagValue}`
                    : `tag:${tagName}`;
                const typeFilter = contentType !== 'all' && TYPE_SEARCH_FILTERS[contentType]
                    ? TYPE_SEARCH_FILTERS[contentType]
                    : '';
                const query = typeFilter ? `${typeFilter} ${tagFilter}` : tagFilter;
                this.logger.info('Tags search', { query, count, page: pageNum });
                const result = await this.client.search({ query, count, page: pageNum });
                return {
                    query,
                    total: result.total,
                    count: result.data.length,
                    page: pageNum,
                    items: result.data.map((item) => ({
                        id: item.id,
                        type: item.type,
                        name: item.name,
                        url: item.url,
                        tags: item.tags ?? [],
                    })),
                };
            },
        };
    }
    // ---------------------------------------------------------------------------
    // Tool 2: bookstack_tags_list_all
    // ---------------------------------------------------------------------------
    createTagListAllTool() {
        return {
            name: 'bookstack_tags_list_all',
            description: 'Enumerate every unique tag name+value pair currently in use across BookStack content, ' +
                'with usage counts. Useful for auditing tag vocabulary, finding typos, and ' +
                'understanding the full tag landscape before bulk operations.',
            inputSchema: {
                type: 'object',
                properties: {
                    content_type: {
                        type: 'string',
                        enum: ['all', 'page', 'book', 'chapter', 'bookshelf'],
                        default: 'all',
                        description: "Limit enumeration to a specific content type, or 'all' (default).",
                    },
                    tag_name_filter: {
                        type: 'string',
                        description: 'Only return tags whose name contains this string (case-insensitive partial match). ' +
                            "E.g. 'status' matches 'Status'.",
                    },
                    max_items: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 500,
                        default: 500,
                        description: 'Max items to scan per content type.',
                    },
                },
            },
            handler: async (params) => {
                const contentType = params.content_type ?? 'all';
                const tagNameFilter = params.tag_name_filter;
                const maxItems = params.max_items ?? 500;
                const typesToScan = contentType === 'all'
                    ? ['book', 'page', 'chapter', 'bookshelf']
                    : [contentType];
                const tagCounts = new Map();
                let totalScanned = 0;
                for (const ct of typesToScan) {
                    const items = await this.fetchAllPages(this.getListFn(ct), maxItems);
                    totalScanned += items.length;
                    for (const item of items) {
                        for (const tag of item.tags ?? []) {
                            const name = tag.name ?? '';
                            const value = tag.value ?? '';
                            if (tagNameFilter &&
                                !name.toLowerCase().includes(tagNameFilter.toLowerCase())) {
                                continue;
                            }
                            const key = `${name}\0${value}`;
                            if (!tagCounts.has(key)) {
                                tagCounts.set(key, { name, value, count: 0, content_types: new Set() });
                            }
                            const entry = tagCounts.get(key);
                            entry.count++;
                            entry.content_types.add(ct);
                        }
                    }
                }
                const tagsList = Array.from(tagCounts.values())
                    .map(e => ({
                    name: e.name,
                    value: e.value,
                    count: e.count,
                    content_types: Array.from(e.content_types).sort(),
                }))
                    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
                    a.value.toLowerCase().localeCompare(b.value.toLowerCase()));
                return {
                    scanned_types: typesToScan,
                    total_items_scanned: totalScanned,
                    unique_tag_names: new Set(tagsList.map(t => t.name)).size,
                    total_tag_name_value_pairs: tagsList.length,
                    tags: tagsList,
                };
            },
        };
    }
    // ---------------------------------------------------------------------------
    // Tool 3: bookstack_tags_audit
    // ---------------------------------------------------------------------------
    createTagAuditTool() {
        return {
            name: 'bookstack_tags_audit',
            description: 'Generate a tag coverage report for a BookStack content type. ' +
                'Shows which items are completely untagged, which are missing specific required tags, ' +
                'and a full tag inventory per item. Use to identify gaps and enforce tagging standards.',
            inputSchema: {
                type: 'object',
                required: ['content_type'],
                properties: {
                    content_type: {
                        type: 'string',
                        enum: ['page', 'book', 'chapter', 'bookshelf'],
                        description: 'Content type to audit.',
                    },
                    required_tag_names: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tag names that every item should have. Items missing any of these are flagged. ' +
                            "E.g. ['Content Type', 'Audience', 'Review Cycle']",
                    },
                    max_items: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 500,
                        default: 200,
                        description: 'Max items to audit.',
                    },
                },
            },
            handler: async (params) => {
                const ct = params.content_type;
                const required = (params.required_tag_names ?? []).map((n) => n.trim());
                const maxItems = params.max_items ?? 200;
                const items = await this.fetchAllPages(this.getListFn(ct), maxItems);
                let itemsNoTags = 0;
                let itemsMissingRequired = 0;
                const reportItems = items.map((item) => {
                    const tags = (item.tags ?? []).map((t) => ({ name: t.name ?? '', value: t.value ?? '' }));
                    const tagNamesPresent = new Set(tags.map(t => t.name));
                    const missing = required.filter(n => !tagNamesPresent.has(n));
                    const hasAll = missing.length === 0;
                    if (!tags.length)
                        itemsNoTags++;
                    if (required.length && !hasAll)
                        itemsMissingRequired++;
                    return {
                        id: item.id,
                        name: item.name,
                        tags,
                        missing_required_tags: missing,
                        has_all_required_tags: hasAll,
                    };
                });
                return {
                    content_type: ct,
                    total_items_audited: reportItems.length,
                    items_with_no_tags: itemsNoTags,
                    required_tag_names: required,
                    items_missing_required_tags: itemsMissingRequired,
                    items: reportItems,
                };
            },
        };
    }
    // ---------------------------------------------------------------------------
    // Tool 4: bookstack_tags_bulk_update
    // ---------------------------------------------------------------------------
    createTagBulkUpdateTool() {
        return {
            name: 'bookstack_tags_bulk_update',
            description: 'Add, update, or remove a tag across multiple BookStack items in a single operation. ' +
                'Always reads existing tags first (read-before-write) so no other tags are overwritten. ' +
                'Supports dry_run mode to preview changes before applying. ' +
                'Select items by explicit ID list or by filter tag (auto-select all that match). ' +
                'Note: uses a read-then-write pattern per item; concurrent edits by other users between ' +
                'the read and write could cause tag loss. For critical operations, use dry_run first and ' +
                'schedule during low-activity windows.',
            inputSchema: {
                type: 'object',
                required: ['content_type', 'operation', 'tag_name'],
                properties: {
                    content_type: {
                        type: 'string',
                        enum: ['page', 'book', 'chapter', 'bookshelf'],
                        description: 'Content type to update.',
                    },
                    operation: {
                        type: 'string',
                        enum: ['add', 'set', 'remove'],
                        description: "'add': add the tag only if the name is not already present. " +
                            "'set': add the tag if missing, or update its value if already present. " +
                            "'remove': delete all tags with this name, regardless of value.",
                    },
                    tag_name: {
                        type: 'string',
                        minLength: 1,
                        description: "Tag name to add/set/remove (e.g. 'Status', 'Priority').",
                    },
                    tag_value: {
                        type: 'string',
                        description: "Tag value. Required for 'add' and 'set' operations. Ignored for 'remove'.",
                    },
                    item_ids: {
                        type: 'array',
                        items: { type: 'integer' },
                        description: 'Explicit list of item IDs to update. ' +
                            'Provide this OR filter_tag_name — not both.',
                    },
                    filter_tag_name: {
                        type: 'string',
                        description: 'Auto-select all items that have a tag with this name. ' +
                            'Used when item_ids is not provided.',
                    },
                    filter_tag_value: {
                        type: 'string',
                        description: "Narrow filter_tag_name selection: only select items where the tag also has this value. " +
                            "E.g. filter_tag_name='Status', filter_tag_value='Placeholder'.",
                    },
                    dry_run: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, show what would be changed without making any writes. ' +
                            'Always test with dry_run=true first for large operations.',
                    },
                },
            },
            handler: async (params) => {
                const ct = params.content_type;
                const operation = params.operation;
                const tagName = params.tag_name;
                const tagValue = params.tag_value;
                const itemIds = params.item_ids;
                const filterTagName = params.filter_tag_name;
                const filterTagValue = params.filter_tag_value;
                const dryRun = params.dry_run ?? false;
                // Validate inputs
                if ((operation === 'add' || operation === 'set') && tagValue === undefined) {
                    throw new Error(`tag_value is required for operation '${operation}'`);
                }
                if (!itemIds?.length && !filterTagName) {
                    throw new Error('Provide either item_ids (list of IDs) or filter_tag_name to select items to update.');
                }
                const listFn = this.getListFn(ct);
                const getFn = this.getGetFn(ct);
                const updateFn = this.getUpdateFn(ct);
                // Resolve target IDs
                let idsToUpdate;
                if (itemIds && itemIds.length > 0) {
                    idsToUpdate = itemIds;
                }
                else {
                    const allItems = await this.fetchAllPages(listFn, 500);
                    idsToUpdate = allItems
                        .filter((item) => (item.tags ?? []).some((t) => t.name === filterTagName &&
                        (filterTagValue === undefined || t.value === filterTagValue)))
                        .map((item) => item.id);
                }
                if (idsToUpdate.length === 0) {
                    return { status: 'no_items_found', items_updated: 0, details: [] };
                }
                this.logger.info('Bulk tag update', {
                    ct,
                    operation,
                    tagName,
                    tagValue,
                    count: idsToUpdate.length,
                    dryRun,
                });
                const details = [];
                for (const itemId of idsToUpdate) {
                    const current = await getFn(itemId);
                    const originalTags = (current.tags ?? []).map((t) => ({ name: t.name ?? '', value: t.value ?? '' }));
                    const newTags = this.applyTagOperation(originalTags, operation, tagName, tagValue);
                    const changed = JSON.stringify(newTags) !== JSON.stringify(originalTags);
                    if (!dryRun && changed) {
                        await updateFn(itemId, { tags: newTags });
                    }
                    details.push({
                        id: itemId,
                        changed,
                        dry_run: dryRun,
                        tags_before: originalTags,
                        tags_after: newTags,
                    });
                }
                return {
                    operation,
                    tag_name: tagName,
                    tag_value: tagValue,
                    content_type: ct,
                    dry_run: dryRun,
                    items_selected: idsToUpdate.length,
                    items_changed: details.filter(d => d.changed).length,
                    items_unchanged: details.filter(d => !d.changed).length,
                    details,
                };
            },
        };
    }
}
exports.TagTools = TagTools;
exports.default = TagTools;
//# sourceMappingURL=tags.js.map