"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionTools = void 0;
/**
 * Permission management tools for BookStack MCP Server
 *
 * Provides 3 tools for content permission management:
 * - Read, update, and audit content permissions
 */
class PermissionTools {
    constructor(client, validator, logger) {
        this.client = client;
        this.validator = validator;
        this.logger = logger;
    }
    /**
     * Get all permission tools
     */
    getTools() {
        return [
            this.createReadPermissionsTool(),
            this.createUpdatePermissionsTool(),
            this.createPermissionsAuditTool(),
        ];
    }
    /**
     * Read permissions tool
     */
    createReadPermissionsTool() {
        return {
            name: 'bookstack_permissions_read',
            description: 'Get permission settings for specific content (books, chapters, pages, or shelves)',
            category: 'permissions',
            inputSchema: {
                type: 'object',
                required: ['content_type', 'content_id'],
                properties: {
                    content_type: {
                        type: 'string',
                        enum: ['book', 'chapter', 'page', 'bookshelf'],
                        description: 'Type of content to check permissions for',
                    },
                    content_id: {
                        type: 'integer',
                        description: 'ID of the content item',
                    },
                },
            },
            examples: [
                {
                    description: 'Check book permissions',
                    input: { content_type: 'book', content_id: 5 },
                    expected_output: 'Permission settings for book ID 5',
                    use_case: 'Understanding who can access a specific book',
                },
                {
                    description: 'Check page permissions',
                    input: { content_type: 'page', content_id: 123 },
                    expected_output: 'Permission settings for page ID 123',
                    use_case: 'Verifying access control for sensitive pages',
                },
            ],
            usage_patterns: [
                'Use before updating permissions to see current state',
                'Check permissions to understand access restrictions',
                'Audit content access settings',
            ],
            related_tools: ['bookstack_permissions_update', 'bookstack_users_list', 'bookstack_roles_list'],
            error_codes: [
                {
                    code: 'UNAUTHORIZED',
                    description: 'Authentication failed or insufficient permissions',
                    recovery_suggestion: 'Verify API token and admin permissions',
                },
                {
                    code: 'NOT_FOUND',
                    description: 'Content item not found',
                    recovery_suggestion: 'Verify content_type and content_id are correct',
                },
            ],
            handler: async (params) => {
                const { content_type, content_id } = params;
                const id = this.validator.validateId(content_id);
                this.logger.debug('Reading permissions', { content_type, content_id: id });
                return await this.client.getContentPermissions(content_type, id);
            },
        };
    }
    /**
     * Update permissions tool
     */
    createUpdatePermissionsTool() {
        return {
            name: 'bookstack_permissions_update',
            description: 'Update permission settings for specific content to control user and role access',
            inputSchema: {
                type: 'object',
                required: ['content_type', 'content_id'],
                properties: {
                    content_type: {
                        type: 'string',
                        enum: ['book', 'chapter', 'page', 'bookshelf'],
                        description: 'Type of content to update permissions for',
                    },
                    content_id: {
                        type: 'integer',
                        description: 'ID of the content item',
                    },
                    fallback_permissions: {
                        type: 'object',
                        properties: {
                            inheriting: {
                                type: 'boolean',
                                description: 'Whether to inherit permissions from parent',
                            },
                            restricted: {
                                type: 'boolean',
                                description: 'Whether content has custom restrictions',
                            },
                        },
                        description: 'Fallback permission settings',
                    },
                    permissions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                role_id: {
                                    type: 'integer',
                                    description: 'Role ID to grant permissions to',
                                },
                                user_id: {
                                    type: 'integer',
                                    description: 'User ID to grant permissions to (alternative to role_id)',
                                },
                                view: {
                                    type: 'boolean',
                                    description: 'Allow view access',
                                },
                                create: {
                                    type: 'boolean',
                                    description: 'Allow create access',
                                },
                                update: {
                                    type: 'boolean',
                                    description: 'Allow update access',
                                },
                                delete: {
                                    type: 'boolean',
                                    description: 'Allow delete access',
                                },
                            },
                        },
                        description: 'Array of specific permission grants',
                    },
                },
            },
            handler: async (params) => {
                const { content_type, content_id, ...updateParams } = params;
                const id = this.validator.validateId(content_id);
                this.logger.info('Updating permissions', { content_type, content_id: id });
                const validatedParams = this.validator.validateParams(updateParams, 'contentPermissionsUpdate');
                return await this.client.updateContentPermissions(content_type, id, validatedParams);
            },
        };
    }
    /**
     * Permissions audit tool
     *
     * Scans all items of one or more content types and reports which ones have
     * custom (non-inheriting) permission overrides.  Useful for security audits
     * and compliance reviews without checking items one by one.
     */
    createPermissionsAuditTool() {
        return {
            name: 'bookstack_permissions_audit',
            description: 'Scan content items and report which ones have custom (non-inheriting) permission overrides. ' +
                'Returns a list of items with custom permissions, their permission details, and summary counts. ' +
                'Use for security audits to find content that deviates from the default permission model.',
            inputSchema: {
                type: 'object',
                properties: {
                    content_types: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['book', 'chapter', 'page', 'bookshelf'],
                        },
                        default: ['book', 'bookshelf'],
                        description: 'Content types to scan. Defaults to books and shelves. ' +
                            'Including pages/chapters can be slow on large instances.',
                    },
                    max_items_per_type: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 500,
                        default: 100,
                        description: 'Maximum items to scan per content type.',
                    },
                },
            },
            handler: async (params) => {
                const contentTypes = params.content_types ?? ['book', 'bookshelf'];
                const maxItems = params.max_items_per_type ?? 100;
                this.logger.info('Auditing permissions', { contentTypes, maxItems });
                const listFns = {
                    book: () => this.client.listBooks({ count: maxItems }),
                    bookshelf: () => this.client.listShelves({ count: maxItems }),
                    chapter: () => this.client.listChapters({ count: maxItems }),
                    page: () => this.client.listPages({ count: maxItems }),
                };
                const customItems = [];
                const scanSummary = {};
                for (const ct of contentTypes) {
                    const listResult = await listFns[ct]();
                    const items = listResult.data;
                    let customCount = 0;
                    for (const item of items) {
                        const perms = await this.client.getContentPermissions(ct, item.id);
                        if (!perms.inheriting) {
                            customCount++;
                            customItems.push({
                                content_type: ct,
                                id: item.id,
                                name: item.name,
                                inheriting: perms.inheriting,
                                permission_count: perms.permissions?.length ?? 0,
                                permissions: perms.permissions ?? [],
                            });
                        }
                    }
                    scanSummary[ct] = { scanned: items.length, custom_permissions: customCount };
                }
                return {
                    scan_summary: scanSummary,
                    total_items_with_custom_permissions: customItems.length,
                    items: customItems,
                };
            },
        };
    }
}
exports.PermissionTools = PermissionTools;
//# sourceMappingURL=permissions.js.map