"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentResources = void 0;
class AttachmentResources {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }
    getResources() {
        return [
            {
                uri: 'bookstack://attachments',
                name: 'Attachments',
                description: 'All file and link attachments in the BookStack instance',
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
                                    extension: { type: 'string' },
                                    uploaded_to: { type: 'number', description: 'Page ID this attachment belongs to' },
                                    external: { type: 'boolean', description: 'True if this is a link rather than an uploaded file' },
                                    order: { type: 'number' },
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
                        uri: 'bookstack://attachments',
                        description: 'List all attachments',
                        expected_format: 'JSON array of attachment objects',
                        use_case: 'Auditing uploaded files or finding attachments to move/delete',
                    },
                ],
                access_patterns: [
                    'Filter by uploaded_to (page ID) to find attachments for a specific page',
                    'Filter by extension to find all PDFs, images, etc.',
                ],
                handler: async (_uri) => {
                    this.logger.debug('Fetching attachments resource');
                    return await this.client.listAttachments();
                },
            },
            {
                uri: 'bookstack://attachments/{id}',
                name: 'Attachment',
                description: 'Specific attachment with download links',
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        extension: { type: 'string' },
                        uploaded_to: { type: 'number' },
                        external: { type: 'boolean' },
                        links: {
                            type: 'object',
                            properties: {
                                html: { type: 'string' },
                                markdown: { type: 'string' },
                            },
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                examples: [
                    {
                        uri: 'bookstack://attachments/15',
                        description: 'Get attachment with download/embed links',
                        expected_format: 'JSON object with attachment metadata and links',
                        use_case: 'Getting the embed URL for an attachment to insert into page content',
                    },
                ],
                access_patterns: [
                    'Use after finding attachment ID from the attachments list',
                ],
                dependencies: ['bookstack://attachments for discovering attachment IDs'],
                handler: async (uri) => {
                    const match = uri.match(/^bookstack:\/\/attachments\/(\d+)$/);
                    if (!match)
                        throw new Error('Invalid attachment resource URI');
                    const id = parseInt(match[1], 10);
                    this.logger.debug('Fetching attachment resource', { id });
                    return await this.client.getAttachment(id);
                },
            },
        ];
    }
}
exports.AttachmentResources = AttachmentResources;
//# sourceMappingURL=attachments.js.map