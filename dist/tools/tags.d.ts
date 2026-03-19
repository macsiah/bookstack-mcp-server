import { BookStackClient } from '../api/client';
import { ValidationHandler } from '../validation/validator';
import { Logger } from '../utils/logger';
import { MCPTool } from '../types';
export declare class TagTools {
    private client;
    private validator;
    private logger;
    private taxonomy?;
    constructor(client: BookStackClient, validator: ValidationHandler, logger: Logger, taxonomy?: Record<string, string[]> | undefined);
    getTools(): MCPTool[];
    /** Paginate through a list endpoint and return all items up to maxItems. */
    private fetchAllPages;
    /** Pure function: apply a tag operation to a tag list. */
    private applyTagOperation;
    /** Return the list method for a given content type. */
    private getListFn;
    /** Return the get-by-id method for a given content type. */
    private getGetFn;
    /** Return the update method for a given content type. */
    private getUpdateFn;
    private createTagTaxonomyTool;
    private createTagSearchTool;
    private createTagListAllTool;
    private createTagAuditTool;
    private createTagBulkUpdateTool;
}
export default TagTools;
//# sourceMappingURL=tags.d.ts.map