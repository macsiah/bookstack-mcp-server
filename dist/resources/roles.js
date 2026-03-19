"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleResources = void 0;
class RoleResources {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }
    getResources() {
        return [
            {
                uri: 'bookstack://roles',
                name: 'Roles',
                description: 'All roles defined in the BookStack instance',
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number' },
                                    display_name: { type: 'string' },
                                    description: { type: 'string' },
                                    mfa_enforced: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        total: { type: 'number' },
                    },
                },
                examples: [
                    {
                        uri: 'bookstack://roles',
                        description: 'List all roles',
                        expected_format: 'JSON array of role objects',
                        use_case: 'Discovering role IDs before assigning permissions or users',
                    },
                ],
                access_patterns: [
                    'Use to resolve role names to IDs before permission assignments',
                    'Combine with bookstack_permissions_update for access control workflows',
                ],
                handler: async (_uri) => {
                    this.logger.debug('Fetching roles resource');
                    return await this.client.listRoles();
                },
            },
            {
                uri: 'bookstack://roles/{id}',
                name: 'Role',
                description: 'Specific role with its permission list',
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        display_name: { type: 'string' },
                        description: { type: 'string' },
                        mfa_enforced: { type: 'boolean' },
                        permissions: { type: 'array', items: { type: 'string' } },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                examples: [
                    {
                        uri: 'bookstack://roles/2',
                        description: 'Get role with all permission strings',
                        expected_format: 'JSON object with role metadata and permissions array',
                        use_case: 'Auditing what a specific role is allowed to do',
                    },
                ],
                access_patterns: [
                    'Use after finding role ID from the roles list',
                ],
                dependencies: ['bookstack://roles for discovering role IDs'],
                handler: async (uri) => {
                    const match = uri.match(/^bookstack:\/\/roles\/(\d+)$/);
                    if (!match)
                        throw new Error('Invalid role resource URI');
                    const id = parseInt(match[1], 10);
                    this.logger.debug('Fetching role resource', { id });
                    return await this.client.getRole(id);
                },
            },
        ];
    }
}
exports.RoleResources = RoleResources;
//# sourceMappingURL=roles.js.map