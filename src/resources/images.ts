import { BookStackClient } from '../api/client';
import { Logger } from '../utils/logger';
import { MCPResource } from '../types';

export class ImageResources {
  constructor(
    private client: BookStackClient,
    private logger: Logger
  ) {}

  getResources(): MCPResource[] {
    return [
      {
        uri: 'bookstack://images',
        name: 'Images',
        description: 'All images in the BookStack image gallery',
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
                  url: { type: 'string' },
                  type: { type: 'string', enum: ['gallery', 'drawio'] },
                  path: { type: 'string' },
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
            uri: 'bookstack://images',
            description: 'List all images in the gallery',
            expected_format: 'JSON array of image objects with URLs',
            use_case: 'Finding existing images to embed in pages rather than re-uploading',
          },
        ],
        access_patterns: [
          'Filter by type="gallery" for general images, type="drawio" for diagrams',
          'Use url field to embed image directly in page HTML/Markdown',
        ],
        handler: async (_uri: string) => {
          this.logger.debug('Fetching images resource');
          return await this.client.listImages();
        },
      },
      {
        uri: 'bookstack://images/{id}',
        name: 'Image',
        description: 'Specific image with full metadata and URL',
        mimeType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string' },
            path: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            uri: 'bookstack://images/33',
            description: 'Get image metadata and direct URL',
            expected_format: 'JSON object with image details and URL for embedding',
            use_case: 'Getting the URL to embed an existing image in page content',
          },
        ],
        access_patterns: [
          'Use after finding image ID from the images list',
        ],
        dependencies: ['bookstack://images for discovering image IDs'],
        handler: async (uri: string) => {
          const match = uri.match(/^bookstack:\/\/images\/(\d+)$/);
          if (!match) throw new Error('Invalid image resource URI');
          const id = parseInt(match[1], 10);
          this.logger.debug('Fetching image resource', { id });
          return await this.client.getImage(id);
        },
      },
    ];
  }
}
