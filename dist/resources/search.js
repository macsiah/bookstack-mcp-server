"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchResources = void 0;
class SearchResources {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }
    getResources() {
        return [
            {
                uri: 'bookstack://search/{query}',
                name: 'Search',
                description: 'Search results for a specific query across all BookStack content types',
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
                                    type: { type: 'string', enum: ['bookshelf', 'book', 'chapter', 'page'] },
                                    url: { type: 'string' },
                                    tags: { type: 'array', items: { type: 'object' } },
                                },
                            },
                        },
                        total: { type: 'number' },
                    },
                },
                examples: [
                    {
                        uri: 'bookstack://search/network%20policy',
                        description: 'Search for pages about network policy',
                        expected_format: 'JSON array of matching content items across all types',
                        use_case: 'Quickly locating relevant documentation by keyword',
                    },
                ],
                access_patterns: [
                    'URL-encode the query string before embedding in the URI',
                    'Use bookstack_search tool for advanced query syntax (filters, tags)',
                ],
                handler: async (uri) => {
                    const match = uri.match(/^bookstack:\/\/search\/(.+)$/);
                    if (!match)
                        throw new Error('Invalid search resource URI');
                    const query = decodeURIComponent(match[1]);
                    this.logger.debug('Fetching search resource', { query });
                    return await this.client.search({ query });
                },
            },
        ];
    }
}
exports.SearchResources = SearchResources;
//# sourceMappingURL=search.js.map