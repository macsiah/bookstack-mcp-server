import { BookStackClient } from '../api/client';
import { Logger } from '../utils/logger';
import { MCPResource } from '../types';

export class UserResources {
  constructor(
    private client: BookStackClient,
    private logger: Logger
  ) {}

  getResources(): MCPResource[] {
    return [
      {
        uri: 'bookstack://users',
        name: 'Users',
        description: 'All users in the BookStack instance',
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
                  name: { type: 'string' },
                  email: { type: 'string' },
                  slug: { type: 'string' },
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
            uri: 'bookstack://users',
            description: 'List all users',
            expected_format: 'JSON array of user objects',
            use_case: 'Discovering user IDs before managing permissions or roles',
          },
        ],
        access_patterns: [
          'Use to resolve user names to IDs before permission assignments',
          'Combine with bookstack_permissions_update for access control workflows',
        ],
        handler: async (_uri: string) => {
          this.logger.debug('Fetching users resource');
          return await this.client.listUsers();
        },
      },
      {
        uri: 'bookstack://users/{id}',
        name: 'User',
        description: 'Specific user with their role assignments',
        mimeType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
            slug: { type: 'string' },
            roles: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            uri: 'bookstack://users/7',
            description: 'Get user with role assignments',
            expected_format: 'JSON object with user metadata and roles array',
            use_case: 'Auditing a specific user\'s permissions',
          },
        ],
        access_patterns: [
          'Use after finding user ID from the users list',
        ],
        dependencies: ['bookstack://users for discovering user IDs'],
        handler: async (uri: string) => {
          const match = uri.match(/^bookstack:\/\/users\/(\d+)$/);
          if (!match) throw new Error('Invalid user resource URI');
          const id = parseInt(match[1], 10);
          this.logger.debug('Fetching user resource', { id });
          return await this.client.getUser(id);
        },
      },
    ];
  }
}
