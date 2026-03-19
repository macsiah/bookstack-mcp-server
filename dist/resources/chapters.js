"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterResources = void 0;
class ChapterResources {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }
    getResources() {
        return [
            {
                uri: 'bookstack://chapters',
                name: 'Chapters',
                description: 'All chapters in the BookStack instance',
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
                        uri: 'bookstack://chapters',
                        description: 'List all chapters',
                        expected_format: 'JSON array of chapter objects',
                        use_case: 'Discovering chapters across all books',
                    },
                ],
                access_patterns: [
                    'Filter by book_id to get chapters within a specific book',
                ],
                handler: async (_uri) => {
                    this.logger.debug('Fetching chapters resource');
                    return await this.client.listChapters();
                },
            },
            {
                uri: 'bookstack://chapters/{id}',
                name: 'Chapter',
                description: 'Specific chapter with its nested pages',
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        book_id: { type: 'number' },
                        pages: { type: 'array', items: { type: 'object' } },
                        tags: { type: 'array', items: { type: 'object' } },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                examples: [
                    {
                        uri: 'bookstack://chapters/10',
                        description: 'Get chapter with all its pages',
                        expected_format: 'JSON object with chapter metadata and pages array',
                        use_case: 'Understanding chapter structure before editing',
                    },
                ],
                access_patterns: [
                    'Use after finding chapter ID from the chapters list or a book',
                ],
                dependencies: ['bookstack://chapters or bookstack://books/{id} for discovering chapter IDs'],
                handler: async (uri) => {
                    const match = uri.match(/^bookstack:\/\/chapters\/(\d+)$/);
                    if (!match)
                        throw new Error('Invalid chapter resource URI');
                    const id = parseInt(match[1], 10);
                    this.logger.debug('Fetching chapter resource', { id });
                    return await this.client.getChapter(id);
                },
            },
        ];
    }
}
exports.ChapterResources = ChapterResources;
//# sourceMappingURL=chapters.js.map