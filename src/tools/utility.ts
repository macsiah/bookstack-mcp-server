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
export class UtilityTools {
  constructor(
    private client: BookStackClient,
    private validator: ValidationHandler,
    private logger: Logger
  ) {}

  getTools(): MCPTool[] {
    return [
      this.createTemplatesListTool(),
      this.createContentPathTool(),
      this.createContentSummarizeTool(),
      this.createAuditLogSummaryTool(),
      this.createRateLimitStatusTool(),
    ];
  }

  // ---------------------------------------------------------------------------
  // bookstack_templates_list
  // ---------------------------------------------------------------------------

  private createTemplatesListTool(): MCPTool {
    return {
      name: 'bookstack_templates_list',
      description:
        'List all pages that are marked as templates in BookStack. ' +
        'Templates can be used as starting points when creating new pages. ' +
        'Optionally filter to templates within a specific book.',
      inputSchema: {
        type: 'object',
        properties: {
          book_id: {
            type: 'integer',
            description: 'Limit results to templates within this book ID. Omit for all books.',
          },
          count: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 50,
            description: 'Maximum number of templates to return.',
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Number of templates to skip for pagination.',
          },
        },
      },
      handler: async (params: any) => {
        const count: number = params.count ?? 50;
        const offset: number = params.offset ?? 0;
        const bookId: number | undefined = params.book_id ? Number(params.book_id) : undefined;

        this.logger.info('Listing page templates', { book_id: bookId, count, offset });

        const filter: Record<string, any> = { template: true };
        if (bookId !== undefined) filter.book_id = bookId;

        const result = await this.client.listPages({ count, offset, filter });

        return {
          total: result.total,
          count: result.data.length,
          templates: result.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            book_id: p.book_id,
            chapter_id: p.chapter_id ?? null,
            slug: p.slug,
            tags: p.tags ?? [],
            updated_at: p.updated_at,
          })),
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // bookstack_content_path
  // ---------------------------------------------------------------------------

  private createContentPathTool(): MCPTool {
    return {
      name: 'bookstack_content_path',
      description:
        'Navigate upward through the BookStack content hierarchy for any page or chapter. ' +
        'Returns the full path from the item up to its parent book, including all IDs, ' +
        'names, and slugs. Useful before bulk edits to understand structure, or for ' +
        'building breadcrumb navigation.\n\n' +
        'Hierarchy: page → chapter (if any) → book\n' +
        'Note: shelf membership is not directly available via the API without a full shelf scan.',
      inputSchema: {
        type: 'object',
        required: ['content_type', 'content_id'],
        properties: {
          content_type: {
            type: 'string',
            enum: ['page', 'chapter'],
            description: 'Type of content to resolve the path for.',
          },
          content_id: {
            type: 'integer',
            description: 'ID of the page or chapter.',
          },
        },
      },
      handler: async (params: any) => {
        const contentType: 'page' | 'chapter' = params.content_type;
        const contentId: number = this.validator.validateId(params.content_id);

        this.logger.info('Resolving content path', { contentType, contentId });

        const path: Array<{ type: string; id: number; name: string; slug: string }> = [];

        if (contentType === 'page') {
          const page = await this.client.getPage(contentId);
          path.push({ type: 'page', id: page.id, name: page.name, slug: page.slug });

          if (page.chapter_id) {
            const chapter = await this.client.getChapter(page.chapter_id);
            path.push({ type: 'chapter', id: chapter.id, name: chapter.name, slug: chapter.slug });
            const book = await this.client.getBook(chapter.book_id);
            path.push({ type: 'book', id: book.id, name: book.name, slug: book.slug });
          } else {
            const book = await this.client.getBook(page.book_id);
            path.push({ type: 'book', id: book.id, name: book.name, slug: book.slug });
          }
        } else {
          const chapter = await this.client.getChapter(contentId);
          path.push({ type: 'chapter', id: chapter.id, name: chapter.name, slug: chapter.slug });
          const book = await this.client.getBook(chapter.book_id);
          path.push({ type: 'book', id: book.id, name: book.name, slug: book.slug });
        }

        return {
          content_type: contentType,
          content_id: contentId,
          path,
          breadcrumb: path.map(p => p.name).join(' › '),
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // bookstack_content_summarize
  // ---------------------------------------------------------------------------

  private createContentSummarizeTool(): MCPTool {
    return {
      name: 'bookstack_content_summarize',
      description:
        'Generate a compact structural summary of a book or chapter without fetching every page\'s full content. ' +
        'Returns page titles, descriptions, tags, and counts — enough for an LLM to understand ' +
        'scope and plan edits without reading every page individually.',
      inputSchema: {
        type: 'object',
        required: ['content_type', 'content_id'],
        properties: {
          content_type: {
            type: 'string',
            enum: ['book', 'chapter'],
            description: 'Type of container to summarise.',
          },
          content_id: {
            type: 'integer',
            description: 'ID of the book or chapter.',
          },
          include_tags: {
            type: 'boolean',
            default: true,
            description: 'Include tag information per item in the summary.',
          },
        },
      },
      handler: async (params: any) => {
        const contentType: 'book' | 'chapter' = params.content_type;
        const contentId: number = this.validator.validateId(params.content_id);
        const includeTags: boolean = params.include_tags ?? true;

        this.logger.info('Summarising content', { contentType, contentId });

        if (contentType === 'book') {
          const book = await this.client.getBook(contentId);
          const contents = book.contents ?? [];

          const chapters = contents.filter((c: any) => c.type === 'chapter');
          const topLevelPages = contents.filter((c: any) => c.type === 'page');

          const summariseItem = (item: any) => ({
            id: item.id,
            type: item.type ?? 'page',
            name: item.name,
            slug: item.slug,
            description: item.description ?? null,
            priority: item.priority ?? null,
            ...(includeTags ? { tags: item.tags ?? [] } : {}),
          });

          return {
            type: 'book',
            id: book.id,
            name: book.name,
            slug: book.slug,
            description: book.description ?? null,
            tags: includeTags ? (book.tags ?? []) : undefined,
            stats: {
              total_items: contents.length,
              chapters: chapters.length,
              top_level_pages: topLevelPages.length,
            },
            contents: contents.map(summariseItem),
          };
        } else {
          const chapter = await this.client.getChapter(contentId);
          const pages = chapter.pages ?? [];

          return {
            type: 'chapter',
            id: chapter.id,
            name: chapter.name,
            slug: chapter.slug,
            book_id: chapter.book_id,
            description: chapter.description ?? null,
            tags: includeTags ? (chapter.tags ?? []) : undefined,
            stats: {
              page_count: pages.length,
            },
            pages: pages.map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              draft: p.draft,
              template: p.template,
              priority: p.priority ?? null,
              ...(includeTags ? { tags: p.tags ?? [] } : {}),
            })),
          };
        }
      },
    };
  }

  // ---------------------------------------------------------------------------
  // bookstack_audit_log_summary
  // ---------------------------------------------------------------------------

  private createAuditLogSummaryTool(): MCPTool {
    return {
      name: 'bookstack_audit_log_summary',
      description:
        'Aggregate audit log entries into a human-readable activity summary over a date range. ' +
        'Returns event-type counts, top active users, and a breakdown by entity type. ' +
        'Useful for weekly/monthly activity reports without paging through raw log entries.',
      inputSchema: {
        type: 'object',
        properties: {
          date_from: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD). Defaults to 7 days ago.',
          },
          date_to: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD). Defaults to today.',
          },
          max_entries: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 500,
            description: 'Maximum audit log entries to scan.',
          },
        },
      },
      handler: async (params: any) => {
        const maxEntries: number = params.max_entries ?? 500;

        // Fetch up to maxEntries recent audit log entries
        this.logger.info('Summarising audit log', { maxEntries });
        const result = await this.client.listAuditLog({ count: maxEntries, offset: 0 });
        const entries = result.data;

        // Filter by date if provided
        const from = params.date_from ? new Date(params.date_from) : null;
        const to = params.date_to ? new Date(params.date_to + 'T23:59:59Z') : null;
        const filtered = entries.filter((e: any) => {
          const ts = new Date(e.created_at);
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        });

        // Aggregate counts
        const byEventType: Record<string, number> = {};
        const byEntityType: Record<string, number> = {};
        const byUser: Record<string, number> = {};

        for (const entry of filtered) {
          byEventType[entry.type] = (byEventType[entry.type] ?? 0) + 1;
          if (entry.entity_type) {
            byEntityType[entry.entity_type] = (byEntityType[entry.entity_type] ?? 0) + 1;
          }
          const userName: string = entry.user?.name ?? `user:${entry.user_id}`;
          byUser[userName] = (byUser[userName] ?? 0) + 1;
        }

        // Top 10 users by activity
        const topUsers = Object.entries(byUser)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));

        return {
          period: {
            from: params.date_from ?? 'beginning of log',
            to: params.date_to ?? 'now',
          },
          total_entries_scanned: result.total,
          entries_in_period: filtered.length,
          by_event_type: byEventType,
          by_entity_type: byEntityType,
          top_users: topUsers,
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // bookstack_ratelimit_status
  // ---------------------------------------------------------------------------

  private createRateLimitStatusTool(): MCPTool {
    return {
      name: 'bookstack_ratelimit_status',
      description:
        'Return the current state of the API rate-limiter token bucket. ' +
        'Use this before starting a large batch operation to understand how many ' +
        'requests are available immediately and how long you may need to wait.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (_params: any) => {
        this.logger.debug('Fetching rate limit status');
        return this.client.getRateLimitStatus();
      },
    };
  }
}

export default UtilityTools;
