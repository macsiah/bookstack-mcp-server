import { BookStackClient } from '../api/client';
import { ValidationHandler } from '../validation/validator';
import { Logger } from '../utils/logger';
import { MCPTool } from '../types';
/**
 * Utility tools for BookStack MCP Server
 *
 * Provides 5 cross-cutting tools that don't map to a single API endpoint:
 *   - bookstack_templates_list     : List pages marked as templates
 *   - bookstack_content_path       : Navigate the content hierarchy upward
 *   - bookstack_content_summarize  : Compact summary of a book or chapter
 *   - bookstack_audit_log_summary  : Aggregated change counts over a date range
 *   - bookstack_ratelimit_status   : Current token-bucket state
 */
export declare class UtilityTools {
    private client;
    private validator;
    private logger;
    constructor(client: BookStackClient, validator: ValidationHandler, logger: Logger);
    getTools(): MCPTool[];
    private createTemplatesListTool;
    private createContentPathTool;
    private createContentSummarizeTool;
    private createAuditLogSummaryTool;
    private createRateLimitStatusTool;
}
export default UtilityTools;
//# sourceMappingURL=utility.d.ts.map