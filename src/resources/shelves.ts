import { BookStackClient } from '../api/client';
import { Logger } from '../utils/logger';
import { MCPResource } from '../types';

export class ShelfResources {
  constructor(
    private client: BookStackClient,
    private logger: Logger
  ) {}

  getResources(): MCPResource[] {
    return [
      {
        uri: 'bookstack://shelves',
        name: 'Shelves',
        description: 'All bookshelves in the BookStack instance',
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
                  slug: { type: 'string' },
                  description: { type: 'string' },
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
            uri: 'bookstack://shelves',
            description: 'List all shelves',
            expected_format: 'JSON array of shelf objects',
            use_case: 'Understanding the top-level organisational structure',
          },
        ],
        access_patterns: [
          'Use as the starting point for navigating from shelf → book → chapter → page',
        ],
        handler: async (_uri: string) => {
          this.logger.debug('Fetching shelves resource');
          return await this.client.listShelves();
        },
      },
      {
        uri: 'bookstack://shelves/{id}',
        name: 'Shelf',
        description: 'Specific bookshelf with its associated books',
        mimeType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            books: { type: 'array', items: { type: 'object' } },
            tags: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            uri: 'bookstack://shelves/3',
            description: 'Get shelf with all its books',
            expected_format: 'JSON object with shelf metadata and books array',
            use_case: 'Navigating from shelf level to individual books',
          },
        ],
        access_patterns: [
          'Use after finding shelf ID from the shelves list',
        ],
        dependencies: ['bookstack://shelves for discovering shelf IDs'],
        handler: async (uri: string) => {
          const match = uri.match(/^bookstack:\/\/shelves\/(\d+)$/);
          if (!match) throw new Error('Invalid shelf resource URI');
          const id = parseInt(match[1], 10);
          this.logger.debug('Fetching shelf resource', { id });
          return await this.client.getShelf(id);
        },
      },
    ];
  }
}
