import { AxiosError } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ErrorHandler } from '../../src/utils/errors';
import { Logger } from '../../src/utils/logger';

jest.mock('../../src/utils/logger');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Partial<Logger>>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    errorHandler = new ErrorHandler(mockLogger as unknown as Logger);
  });

  describe('handleError', () => {
    it('should return McpError instances unchanged', () => {
      const original = new McpError(ErrorCode.InvalidParams, 'bad params');
      const result = errorHandler.handleError(original);
      expect(result).toBe(original);
    });

    it('should handle AxiosError via instanceof check', () => {
      const axiosErr = new AxiosError('Not Found');
      (axiosErr as any).response = { status: 404, data: null };
      (axiosErr as any).config = { url: '/books/999', method: 'get' };

      const result = errorHandler.handleError(axiosErr);
      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InvalidRequest);
    });

    it('should map 400 to InvalidParams', () => {
      const axiosErr = new AxiosError('Bad Request');
      (axiosErr as any).response = { status: 400, data: null };
      (axiosErr as any).config = { url: '/books', method: 'post' };

      const result = errorHandler.handleAxiosError(axiosErr);
      expect(result.code).toBe(ErrorCode.InvalidParams);
    });

    it('should map 401 to InvalidRequest', () => {
      const axiosErr = new AxiosError('Unauthorized');
      (axiosErr as any).response = { status: 401, data: null };
      (axiosErr as any).config = { url: '/books', method: 'get' };

      const result = errorHandler.handleAxiosError(axiosErr);
      expect(result.code).toBe(ErrorCode.InvalidRequest);
    });

    it('should map 429 to InternalError', () => {
      const axiosErr = new AxiosError('Too Many Requests');
      (axiosErr as any).response = { status: 429, data: null };
      (axiosErr as any).config = { url: '/books', method: 'get' };

      const result = errorHandler.handleAxiosError(axiosErr);
      expect(result.code).toBe(ErrorCode.InternalError);
    });

    it('should handle ZodError', () => {
      const { ZodError } = require('zod');
      const zodErr = new ZodError([{ path: ['name'], message: 'Required', code: 'invalid_type', expected: 'string', received: 'undefined' }]);

      const result = errorHandler.handleError(zodErr);
      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InvalidParams);
    });

    it('should handle generic Error', () => {
      const genericErr = new Error('Something went wrong');
      const result = errorHandler.handleError(genericErr);
      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toContain('Something went wrong');
    });
  });
});
