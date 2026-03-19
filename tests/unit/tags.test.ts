import { TagTools } from '../../src/tools/tags';
import { BookStackClient } from '../../src/api/client';
import { ValidationHandler } from '../../src/validation/validator';
import { Logger } from '../../src/utils/logger';

jest.mock('../../src/api/client');
jest.mock('../../src/validation/validator');
jest.mock('../../src/utils/logger');

describe('TagTools', () => {
  let tagTools: TagTools;
  let mockClient: any;
  let mockValidator: any;
  let mockLogger: any;

  beforeEach(() => {
    mockClient = {
      listBooks: jest.fn(),
      listPages: jest.fn(),
      listChapters: jest.fn(),
      listShelves: jest.fn(),
      getBook: jest.fn(),
      getPage: jest.fn(),
      getChapter: jest.fn(),
      getShelf: jest.fn(),
      updateBook: jest.fn(),
      updatePage: jest.fn(),
      updateChapter: jest.fn(),
      updateShelf: jest.fn(),
      search: jest.fn(),
    };

    mockValidator = {
      validateParams: jest.fn((params: any) => params),
      validateId: jest.fn((id: any) => Number(id)),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    tagTools = new TagTools(
      mockClient as BookStackClient,
      mockValidator as ValidationHandler,
      mockLogger as Logger
    );
  });

  describe('getTools', () => {
    it('should return 4 tag tools', () => {
      const tools = tagTools.getTools();
      expect(tools).toHaveLength(4);
      const names = tools.map(t => t.name);
      expect(names).toContain('bookstack_tags_search');
      expect(names).toContain('bookstack_tags_list_all');
      expect(names).toContain('bookstack_tags_audit');
      expect(names).toContain('bookstack_tags_bulk_update');
    });
  });

  describe('bookstack_tags_search', () => {
    it('should search by tag name only', async () => {
      const mockResult = { data: [{ id: 1, type: 'page', name: 'Test', url: '/p/1', tags: [] }], total: 1 };
      mockClient.search!.mockResolvedValue(mockResult as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_search')!;
      const result = await tool.handler({ tag_name: 'Status' }) as any;

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'tag:Status' })
      );
      expect(result.total).toBe(1);
    });

    it('should search by tag name and value', async () => {
      const mockResult = { data: [], total: 0 };
      mockClient.search!.mockResolvedValue(mockResult as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_search')!;
      await tool.handler({ tag_name: 'Status', tag_value: 'Draft' });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'tag:Status=Draft' })
      );
    });

    it('should include content type filter', async () => {
      const mockResult = { data: [], total: 0 };
      mockClient.search!.mockResolvedValue(mockResult as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_search')!;
      await tool.handler({ tag_name: 'Status', content_type: 'page' });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: '[page] tag:Status' })
      );
    });
  });

  describe('bookstack_tags_list_all', () => {
    it('should enumerate tags from all content types', async () => {
      const booksResponse = {
        data: [{ id: 1, tags: [{ name: 'Status', value: 'Draft' }] }],
        total: 1,
      };
      const emptyResponse = { data: [], total: 0 };

      mockClient.listBooks!.mockResolvedValue(booksResponse as any);
      mockClient.listPages!.mockResolvedValue(emptyResponse as any);
      mockClient.listChapters!.mockResolvedValue(emptyResponse as any);
      mockClient.listShelves!.mockResolvedValue(emptyResponse as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_list_all')!;
      const result = await tool.handler({}) as any;

      expect(result.total_tag_name_value_pairs).toBe(1);
      expect(result.tags[0]).toMatchObject({ name: 'Status', value: 'Draft', count: 1 });
    });

    it('should filter tags by name', async () => {
      const booksResponse = {
        data: [{ id: 1, tags: [{ name: 'Status', value: 'Draft' }, { name: 'Audience', value: 'Staff' }] }],
        total: 1,
      };
      const emptyResponse = { data: [], total: 0 };

      mockClient.listBooks!.mockResolvedValue(booksResponse as any);
      mockClient.listPages!.mockResolvedValue(emptyResponse as any);
      mockClient.listChapters!.mockResolvedValue(emptyResponse as any);
      mockClient.listShelves!.mockResolvedValue(emptyResponse as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_list_all')!;
      const result = await tool.handler({ tag_name_filter: 'status' }) as any;

      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].name).toBe('Status');
    });
  });

  describe('bookstack_tags_audit', () => {
    it('should flag items missing required tags', async () => {
      const pagesResponse = {
        data: [
          { id: 1, name: 'Page A', tags: [{ name: 'Status', value: 'Draft' }] },
          { id: 2, name: 'Page B', tags: [] },
        ],
        total: 2,
      };
      mockClient.listPages!.mockResolvedValue(pagesResponse as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_audit')!;
      const result = await tool.handler({
        content_type: 'page',
        required_tag_names: ['Status'],
      }) as any;

      expect(result.items_missing_required_tags).toBe(1);
      expect(result.items_with_no_tags).toBe(1);
      const pageB = result.items.find((i: any) => i.id === 2);
      expect(pageB.missing_required_tags).toContain('Status');
    });
  });

  describe('bookstack_tags_bulk_update (add)', () => {
    it('should add a tag to specified item IDs (dry run)', async () => {
      const mockPage = { id: 1, name: 'Page A', tags: [] };
      mockClient.getPage!.mockResolvedValue(mockPage as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_bulk_update')!;
      const result = await tool.handler({
        content_type: 'page',
        operation: 'add',
        tag_name: 'Status',
        tag_value: 'Draft',
        item_ids: [1],
        dry_run: true,
      }) as any;

      expect(result.dry_run).toBe(true);
      expect(result.items_changed).toBe(1);
      expect(mockClient.updatePage).not.toHaveBeenCalled();
    });

    it('should apply changes when dry_run is false', async () => {
      const mockPage = { id: 1, name: 'Page A', tags: [] };
      mockClient.getPage!.mockResolvedValue(mockPage as any);
      mockClient.updatePage!.mockResolvedValue({ id: 1 } as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_bulk_update')!;
      await tool.handler({
        content_type: 'page',
        operation: 'add',
        tag_name: 'Status',
        tag_value: 'Draft',
        item_ids: [1],
        dry_run: false,
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith(1, {
        tags: [{ name: 'Status', value: 'Draft' }],
      });
    });

    it('should throw when tag_value is missing for add/set operations', async () => {
      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_bulk_update')!;

      await expect(
        tool.handler({ content_type: 'page', operation: 'add', tag_name: 'Status', item_ids: [1] })
      ).rejects.toThrow("tag_value is required for operation 'add'");
    });

    it('should throw when neither item_ids nor filter_tag_name is provided', async () => {
      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_bulk_update')!;

      await expect(
        tool.handler({ content_type: 'page', operation: 'remove', tag_name: 'Status' })
      ).rejects.toThrow('Provide either item_ids');
    });
  });

  describe('fetchAllPages pagination', () => {
    it('should stop fetching when batch is smaller than requested count', async () => {
      // First call returns full page, second returns partial (last page)
      mockClient.listPages!
        .mockResolvedValueOnce({ data: new Array(100).fill({ id: 1, tags: [] }), total: 150 } as any)
        .mockResolvedValueOnce({ data: new Array(50).fill({ id: 2, tags: [] }), total: 150 } as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_audit')!;
      const result = await tool.handler({ content_type: 'page', max_items: 500 }) as any;

      expect(result.total_items_audited).toBe(150);
      expect(mockClient.listPages).toHaveBeenCalledTimes(2);
    });

    it('should not overshoot maxItems', async () => {
      mockClient.listPages!.mockResolvedValue({
        data: new Array(100).fill({ id: 1, tags: [] }),
        total: 1000,
      } as any);

      const tools = tagTools.getTools();
      const tool = tools.find(t => t.name === 'bookstack_tags_audit')!;
      const result = await tool.handler({ content_type: 'page', max_items: 50 }) as any;

      // With max_items=50, first call should request count=50 and then stop
      expect(result.total_items_audited).toBe(50);
    });
  });
});
