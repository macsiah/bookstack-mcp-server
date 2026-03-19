#!/usr/bin/env node
/**
 * BookStack MCP Server
 *
 * Provides comprehensive access to BookStack knowledge management system
 * through the Model Context Protocol (MCP).
 *
 * Features:
 * - 71 tools covering all BookStack API endpoints plus tag, utility, and batch tools
 * - Resource access for all content types (books, pages, chapters, shelves, users, search, roles, attachments, images)
 * - Comprehensive error handling and validation
 * - Rate limiting
 */
export declare class BookStackMCPServer {
    private server;
    private client;
    private logger;
    private errorHandler;
    private validator;
    private tools;
    private resources;
    constructor();
    /**
     * Setup all tools for BookStack API endpoints
     */
    private setupTools;
    /**
     * Setup all resources for BookStack content access
     */
    private setupResources;
    /**
     * Setup MCP server request handlers
     */
    private setupHandlers;
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Shutdown the server gracefully
     */
    private shutdown;
    /**
     * Get server health status
     */
    getHealth(): Promise<{
        status: 'healthy' | 'unhealthy';
        checks: Array<{
            name: string;
            healthy: boolean;
            message?: string;
        }>;
    }>;
}
export default BookStackMCPServer;
//# sourceMappingURL=server.d.ts.map