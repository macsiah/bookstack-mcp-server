import { BookStackClient } from '../api/client';
import { ValidationHandler } from '../validation/validator';
import { Logger } from '../utils/logger';
import { MCPTool } from '../types';
/**
 * Batch operation tools for BookStack MCP Server
 *
 * Provides tools for creating multiple content items in a single operation:
 *   - bookstack_batch_create_content : Create multiple pages and/or chapters at once
 */
export declare class BatchTools {
    private client;
    private validator;
    private logger;
    constructor(client: BookStackClient, validator: ValidationHandler, logger: Logger);
    getTools(): MCPTool[];
    private createBatchCreateContentTool;
}
export default BatchTools;
//# sourceMappingURL=batch.d.ts.map