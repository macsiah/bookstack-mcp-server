import { BookStackClient } from '../api/client';
import { ValidationHandler } from '../validation/validator';
import { Logger } from '../utils/logger';
import { MCPTool } from '../types';
/**
 * Permission management tools for BookStack MCP Server
 *
 * Provides 3 tools for content permission management:
 * - Read, update, and audit content permissions
 */
export declare class PermissionTools {
    private client;
    private validator;
    private logger;
    constructor(client: BookStackClient, validator: ValidationHandler, logger: Logger);
    /**
     * Get all permission tools
     */
    getTools(): MCPTool[];
    /**
     * Read permissions tool
     */
    private createReadPermissionsTool;
    /**
     * Update permissions tool
     */
    private createUpdatePermissionsTool;
    /**
     * Permissions audit tool
     *
     * Scans all items of one or more content types and reports which ones have
     * custom (non-inheriting) permission overrides.  Useful for security audits
     * and compliance reviews without checking items one by one.
     */
    private createPermissionsAuditTool;
}
//# sourceMappingURL=permissions.d.ts.map