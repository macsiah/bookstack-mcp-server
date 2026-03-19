import { AxiosError } from 'axios';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from './logger';
/**
 * Error handler for BookStack MCP Server
 */
export declare class ErrorHandler {
    private logger;
    private errorMappings;
    constructor(logger: Logger);
    /**
     * Handle Axios errors specifically
     */
    handleAxiosError(error: AxiosError): McpError;
    /**
     * Handle generic errors
     */
    handleError(error: any): McpError;
    /**
     * Map HTTP status codes to MCP error codes.
     *
     * MCP's ErrorCode vocabulary is limited, so we map as semantically close as
     * possible and rely on the error message + data.type for finer distinction:
     *   400 / 422 → InvalidParams   (caller sent bad data)
     *   401       → InvalidRequest  (unauthenticated — no valid token)
     *   403       → InvalidRequest  (authenticated but not permitted)
     *   404       → InvalidRequest  (resource doesn't exist)
     *   429 / 5xx → InternalError   (server-side or rate-limit problem)
     *
     * Callers that need to tell 401 from 403 from 404 apart should inspect
     * error.data.type ('authentication_error', 'permission_error', 'not_found_error').
     */
    private mapToMCPErrorCode;
}
export default ErrorHandler;
//# sourceMappingURL=errors.d.ts.map