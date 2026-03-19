"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchTools = void 0;
/**
 * Batch operation tools for BookStack MCP Server
 *
 * Provides tools for creating multiple content items in a single operation:
 *   - bookstack_batch_create_content : Create multiple pages and/or chapters at once
 */
class BatchTools {
    constructor(client, validator, logger) {
        this.client = client;
        this.validator = validator;
        this.logger = logger;
    }
    getTools() {
        return [this.createBatchCreateContentTool()];
    }
    // ---------------------------------------------------------------------------
    // bookstack_batch_create_content
    // ---------------------------------------------------------------------------
    createBatchCreateContentTool() {
        return {
            name: 'bookstack_batch_create_content',
            description: 'Create multiple pages and/or chapters in a single call. ' +
                'Items are created sequentially; each item\'s result (or error) is reported ' +
                'individually so a partial failure does not abort the whole batch. ' +
                'Returns a summary with counts of successes and failures plus per-item details.',
            inputSchema: {
                type: 'object',
                required: ['items'],
                properties: {
                    items: {
                        type: 'array',
                        minItems: 1,
                        maxItems: 50,
                        description: 'Array of content items to create (max 50 per call).',
                        items: {
                            type: 'object',
                            required: ['type', 'name'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['page', 'chapter'],
                                    description: 'Content type to create.',
                                },
                                name: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 255,
                                    description: 'Name/title of the new item.',
                                },
                                book_id: {
                                    type: 'integer',
                                    description: 'Book ID. Required for chapters and for pages not placed in a chapter.',
                                },
                                chapter_id: {
                                    type: 'integer',
                                    description: 'Chapter ID. Use instead of book_id to place a page inside a chapter.',
                                },
                                html: {
                                    type: 'string',
                                    description: 'HTML content (for pages). Either html or markdown is required.',
                                },
                                markdown: {
                                    type: 'string',
                                    description: 'Markdown content (for pages). Either html or markdown is required.',
                                },
                                description: {
                                    type: 'string',
                                    maxLength: 1900,
                                    description: 'Plain-text description (for chapters).',
                                },
                                tags: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: ['name', 'value'],
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                    },
                                    description: 'Tags to apply to the created item.',
                                },
                                priority: {
                                    type: 'integer',
                                    description: 'Sort priority within the parent container.',
                                },
                            },
                        },
                    },
                },
            },
            handler: async (params) => {
                const items = params.items ?? [];
                if (items.length === 0) {
                    return { status: 'no_items', created: 0, failed: 0, results: [] };
                }
                if (items.length > 50) {
                    throw new Error('batch_create_content: maximum 50 items per call');
                }
                this.logger.info('Batch creating content', { count: items.length });
                const results = [];
                let created = 0;
                let failed = 0;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    try {
                        let created_item;
                        if (item.type === 'chapter') {
                            if (!item.book_id) {
                                throw new Error('book_id is required for chapters');
                            }
                            created_item = await this.client.createChapter({
                                name: item.name,
                                book_id: Number(item.book_id),
                                description: item.description,
                                tags: item.tags,
                                priority: item.priority,
                            });
                        }
                        else {
                            // page
                            if (!item.book_id && !item.chapter_id) {
                                throw new Error('Either book_id or chapter_id is required for pages');
                            }
                            if (!item.html && !item.markdown) {
                                throw new Error('Either html or markdown content is required for pages');
                            }
                            const pageParams = {
                                name: item.name,
                                html: item.html,
                                markdown: item.markdown,
                                tags: item.tags,
                                priority: item.priority,
                            };
                            if (item.book_id)
                                pageParams.book_id = Number(item.book_id);
                            if (item.chapter_id)
                                pageParams.chapter_id = Number(item.chapter_id);
                            created_item = await this.client.createPage(pageParams);
                        }
                        results.push({
                            index: i,
                            status: 'created',
                            type: item.type,
                            name: item.name,
                            id: created_item.id,
                            slug: created_item.slug,
                        });
                        created++;
                        this.logger.info('Batch item created', { index: i, type: item.type, id: created_item.id });
                    }
                    catch (err) {
                        results.push({
                            index: i,
                            status: 'error',
                            type: item.type,
                            name: item.name,
                            error: err.message ?? String(err),
                        });
                        failed++;
                        this.logger.warn('Batch item failed', { index: i, type: item.type, error: err.message });
                    }
                }
                return {
                    total: items.length,
                    created,
                    failed,
                    results,
                };
            },
        };
    }
}
exports.BatchTools = BatchTools;
exports.default = BatchTools;
//# sourceMappingURL=batch.js.map