import { AxiosError } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from './logger';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Error handler for BookStack MCP Server
 */
export class ErrorHandler {
  private errorMappings = {
    400: { type: 'validation_error', message: 'Invalid request parameters' },
    401: { type: 'authentication_error', message: 'Invalid or missing authentication token' },
    403: { type: 'permission_error', message: 'Insufficient permissions for this operation' },
    404: { type: 'not_found_error', message: 'Requested resource not found' },
    422: { type: 'validation_error', message: 'Validation failed' },
    429: { type: 'rate_limit_error', message: 'Rate limit exceeded' },
    500: { type: 'server_error', message: 'Internal server error' },
    502: { type: 'server_error', message: 'Bad gateway' },
    503: { type: 'server_error', message: 'Service unavailable' },
    504: { type: 'server_error', message: 'Gateway timeout' },
  };

  constructor(private logger: Logger) {}

  /**
   * Handle Axios errors specifically
   */
  handleAxiosError(error: AxiosError): McpError {
    const status = error.response?.status;
    const mapping = this.errorMappings[status as keyof typeof this.errorMappings] || { 
      type: 'unknown_error', 
      message: 'Unknown error occurred' 
    };

    const mcpError = new McpError(
      this.mapToMCPErrorCode(status),
      mapping.message,
      { 
        type: mapping.type,
        status,
        details: error.response?.data,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      }
    );

    this.logger.error('Axios error handled', {
      status,
      type: mapping.type,
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
    });

    return mcpError;
  }

  /**
   * Handle generic errors
   */
  handleError(error: any): McpError {
    if (error instanceof McpError) {
      return error;
    }

    if (error instanceof AxiosError) {
      return this.handleAxiosError(error);
    }

    // Handle validation errors from Zod
    if (error.name === 'ZodError') {
      const validationDetails = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return new McpError(
        ErrorCode.InvalidParams,
        'Validation failed',
        { 
          type: 'validation_error',
          validation: validationDetails,
        }
      );
    }

    // Handle generic errors.
    // Stack traces are only included in development — in production they leak
    // internal file paths and implementation details to the MCP client.
    const mcpError = new McpError(
      ErrorCode.InternalError,
      error.message || 'An unexpected error occurred',
      {
        type: 'internal_error',
        ...(isDevelopment && { stack: error.stack }),
      }
    );

    this.logger.error('Generic error handled', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return mcpError;
  }

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
  private mapToMCPErrorCode(status?: number): ErrorCode {
    switch (status) {
      case 400:
      case 422:
        return ErrorCode.InvalidParams;
      case 401:
      case 403:
      case 404:
        return ErrorCode.InvalidRequest;
      case 429:
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorCode.InternalError;
      default:
        return ErrorCode.InternalError;
    }
  }

}

export default ErrorHandler;