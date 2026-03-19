import { BookStackClient } from '../api/client';
import { Logger } from '../utils/logger';
import { MCPResource } from '../types';

export class PageResources {
  constructor(
    private client: BookStackClient,
    private logger: Logger
  ) {}

  getResources(): MCPResource[] {
    return [
      {
        uri: 'bookstack://pages',
        name: 'Pages',
        description: 'All pages in the BookStack instance with metadata',
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
                  book_id: { type: 'number' },
                  chapter_id: { type: 'number' },
                  slug: { type: 'string' },
                  draft: { type: 'boolean' },
                  template: { type: 'boolean' },
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
            uri: 'bookstack://pages',
            description: 'List all pages',
            expected_format: 'JSON array of page objects with metadata',
            use_case: 'Discovering all available pages across books',
          },
        ],
        access_patterns: [
          'Use for bulk page discovery',
          'Filter by book_id or chapter_id for scoped browsing',
        ],
        handler: async (_uri: string) => {
          this.logger.debug('Fetching pages resource');
          return await this.client.listPages();
        },
      },
      {
        uri: 'bookstack://pages/{id}',
        name: 'Page',
        description: 'Specific page with full HTML and Markdown content',
        mimeType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            book_id: { type: 'number' },
            chapter_id: { type: 'number' },
            html: { type: 'string' },
            markdown: { type: 'string' },
            tags: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            uri: 'bookstack://pages/42',
            description: 'Get a page with full content',
            expected_format: 'JSON object with page metadata and html/markdown content',
            use_case: 'Reading page content for summarisation or editing',
          },
        ],
        access_patterns: [
          'Use after finding page ID from the pages list',
          'Reference html or markdown fields for content',
        ],
        dependencies: ['bookstack://pages for discovering page IDs'],
        handler: async (uri: string) => {
          const match = uri.match(/^bookstack:\/\/pages\/(\d+)$/);
          if (!match) throw new Error('Invalid page resource URI');
          const id = parseInt(match[1], 10);
          this.logger.debug('Fetching page resource', { id });
          return await this.client.getPage(id);
        },
      },
    ];
  }
}
