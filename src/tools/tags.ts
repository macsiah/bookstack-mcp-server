import { BookStackClient } from '../api/client';
import { ValidationHandler } from '../validation/validator';
import { Logger } from '../utils/logger';
import { MCPTool } from '../types';

/**
 * Tag management tools for BookStack MCP Server
 *
 * Provides 4 tools for working with BookStack content tags:
 *   - bookstack_tags_search:      Search content by tag name/value (correct query encoding)
 *   - bookstack_tags_list_all:    Enumerate all tags in use with usage counts
 *   - bookstack_tags_audit:       Coverage report for enforcing tagging standards
 *   - bookstack_tags_bulk_update: Safe bulk add/set/remove with read-before-write
 *
 * Developed for Sunnyside School District to support the IT Operations
 * BookStack tag taxonomy.
 */

type ContentTypeSingle = 'page' | 'book' | 'chapter' | 'bookshelf';
type ContentTypeWithAll = ContentTypeSingle | 'all';
type BulkOperation = 'add' | 'set' | 'remove';

const TYPE_SEARCH_FILTERS: Record<ContentTypeSingle, string> = {
  page: '[page]',
  book: '[book]',
  chapter: '[chapter]',
  bookshelf: '[bookshelf]',
};

export class TagTools {
  constructor(
    private client: BookStackClient,
    private validator: ValidationHandler,
    private logger: Logger
  ) {}

  getTools(): MCPTool[] {
    return [
      this.createTagSearchTool(),
      this.createTagListAllTool(),
      this.createTagAuditTool(),
      this.createTagBulkUpdateTool(),
    ];
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Paginate through a list endpoint and return all items up to maxItems. */
  private async fetchAllPages(
    listFn: (params: { count: number; offset: number }) => Promise<{ data: any[]; total: number }>,
    maxItems = 500
  ): Promise<any[]> {
    const items: any[] = [];
    let offset = 0;
    const pageSize = 100;

    while (items.length < maxItems) {
      const remaining = maxItems - items.length;
      const count = Math.min(pageSize, remaining);
      const data = await listFn({ count, offset });
      const batch: any[] = data.data || [];
      items.push(...batch);
      // Stop if: we got fewer items than requested (last page), nothing came back,
      // or we've now collected everything the server has.
      if (batch.length < count || batch.length === 0 || items.length >= (data.total ?? Infinity)) {
        break;
      }
      offset += batch.length;
    }

    // Safety net: if the API returned more items than the count we requested,
    // still honour maxItems so callers get predictable bounds.
    return items.slice(0, maxItems);
  }

  /** Pure function: apply a tag operation to a tag list. */
  private applyTagOperation(
    tags: Array<{ name: string; value: string }>,
    operation: BulkOperation,
    name: string,
    value?: string
  ): Array<{ name: string; value: string }> {
    if (operation === 'remove') {
      return tags.filter(t => t.name !== name);
    }

    const existingNames = new Set(tags.map(t => t.name));

    if (operation === 'add') {
      if (existingNames.has(name)) return tags; // already present — skip
      return [...tags, { name, value: value ?? '' }];
    }

    // 'set': add or overwrite
    if (existingNames.has(name)) {
      return tags.map(t => (t.name === name ? { name, value: value ?? '' } : t));
    }
    return [...tags, { name, value: value ?? '' }];
  }

  /** Return the list method for a given content type. */
  private getListFn(ct: ContentTypeSingle) {
    switch (ct) {
      case 'book':      return (p: any) => this.client.listBooks(p);
      case 'page':      return (p: any) => this.client.listPages(p);
      case 'chapter':   return (p: any) => this.client.listChapters(p);
      case 'bookshelf': return (p: any) => this.client.listShelves(p);
    }
  }

  /** Return the get-by-id method for a given content type. */
  private getGetFn(ct: ContentTypeSingle) {
    switch (ct) {
      case 'book':      return (id: number) => this.client.getBook(id);
      case 'page':      return (id: number) => this.client.getPage(id);
      case 'chapter':   return (id: number) => this.client.getChapter(id);
      case 'bookshelf': return (id: number) => this.client.getShelf(id);
    }
  }

  /** Return the update method for a given content type. */
  private getUpdateFn(ct: ContentTypeSingle) {
    switch (ct) {
      case 'book':      return (id: number, data: any) => this.client.updateBook(id, data);
      case 'page':      return (id: number, data: any) => this.client.updatePage(id, data);
      case 'chapter':   return (id: number, data: any) => this.client.updateChapter(id, data);
      case 'bookshelf': return (id: number, data: any) => this.client.updateShelf(id, data);
    }
  }

  // ---------------------------------------------------------------------------
  // Tool 1: bookstack_tags_search
  // ---------------------------------------------------------------------------

  private createTagSearchTool(): MCPTool {
    return {
      name: 'bookstack_tags_search',
      description:
        'Search BookStack content by tag name and optional value. ' +
        'Use this instead of bookstack_search for tag filtering — it explicitly ' +
        'constructs the tag:Name=Value query syntax and returns matched items with their tags. ' +
        'Examples: find all Placeholder pages, all Critical-priority books, all FERPA-tagged content.',
      inputSchema: {
        type: 'object',
        required: ['tag_name'],
        properties: {
          tag_name: {
            type: 'string',
            minLength: 1,
            description: "Tag name to filter by (e.g. 'Status', 'Priority', 'Compliance', 'Audience')",
          },
          tag_value: {
            type: 'string',
            description:
              "Tag value to match (e.g. 'Placeholder', 'Critical', 'FERPA'). " +
              'Omit to match any value of this tag name.',
          },
          content_type: {
            type: 'string',
            enum: ['all', 'page', 'book', 'chapter', 'bookshelf'],
            default: 'all',
            description: "Content type to search. Use 'all' to search across every type.",
          },
          count: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Results per page (1–100)',
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number for pagination',
          },
        },
      },
      handler: async (params: any) => {
        const tagName: string = params.tag_name;
        const tagValue: string | undefined = params.tag_value;
        const contentType: ContentTypeWithAll = params.content_type ?? 'all';
        const count: number = params.count ?? 20;
        const pageNum: number = params.page ?? 1;

        // Build BookStack search query: [type] tag:Name=Value
        const tagFilter = tagValue !== undefined
          ? `tag:${tagName}=${tagValue}`
          : `tag:${tagName}`;

        const typeFilter =
          contentType !== 'all' && TYPE_SEARCH_FILTERS[contentType as ContentTypeSingle]
            ? TYPE_SEARCH_FILTERS[contentType as ContentTypeSingle]
            : '';

        const query = typeFilter ? `${typeFilter} ${tagFilter}` : tagFilter;

        this.logger.info('Tags search', { query, count, page: pageNum });

        const result = await this.client.search({ query, count, page: pageNum });

        return {
          query,
          total: result.total,
          count: result.data.length,
          page: pageNum,
          items: result.data.map((item: any) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            url: item.url,
            tags: item.tags ?? [],
          })),
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Tool 2: bookstack_tags_list_all
  // ---------------------------------------------------------------------------

  private createTagListAllTool(): MCPTool {
    return {
      name: 'bookstack_tags_list_all',
      description:
        'Enumerate every unique tag name+value pair currently in use across BookStack content, ' +
        'with usage counts. Useful for auditing tag vocabulary, finding typos, and ' +
        'understanding the full tag landscape before bulk operations.',
      inputSchema: {
        type: 'object',
        properties: {
          content_type: {
            type: 'string',
            enum: ['all', 'page', 'book', 'chapter', 'bookshelf'],
            default: 'all',
            description: "Limit enumeration to a specific content type, or 'all' (default).",
          },
          tag_name_filter: {
            type: 'string',
            description:
              'Only return tags whose name contains this string (case-insensitive partial match). ' +
              "E.g. 'status' matches 'Status'.",
          },
          max_items: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 500,
            description: 'Max items to scan per content type.',
          },
        },
      },
      handler: async (params: any) => {
        const contentType: ContentTypeWithAll = params.content_type ?? 'all';
        const tagNameFilter: string | undefined = params.tag_name_filter;
        const maxItems: number = params.max_items ?? 500;

        const typesToScan: ContentTypeSingle[] =
          contentType === 'all'
            ? ['book', 'page', 'chapter', 'bookshelf']
            : [contentType as ContentTypeSingle];

        const tagCounts = new Map<
          string,
          { name: string; value: string; count: number; content_types: Set<string> }
        >();
        let totalScanned = 0;

        for (const ct of typesToScan) {
          const items = await this.fetchAllPages(this.getListFn(ct), maxItems);
          totalScanned += items.length;

          for (const item of items) {
            for (const tag of item.tags ?? []) {
              const name: string = tag.name ?? '';
              const value: string = tag.value ?? '';

              if (
                tagNameFilter &&
                !name.toLowerCase().includes(tagNameFilter.toLowerCase())
              ) {
                continue;
              }

              const key = `${name}\0${value}`;
              if (!tagCounts.has(key)) {
                tagCounts.set(key, { name, value, count: 0, content_types: new Set() });
              }
              const entry = tagCounts.get(key)!;
              entry.count++;
              entry.content_types.add(ct);
            }
          }
        }

        const tagsList = Array.from(tagCounts.values())
          .map(e => ({
            name: e.name,
            value: e.value,
            count: e.count,
            content_types: Array.from(e.content_types).sort(),
          }))
          .sort(
            (a, b) =>
              a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
              a.value.toLowerCase().localeCompare(b.value.toLowerCase())
          );

        return {
          scanned_types: typesToScan,
          total_items_scanned: totalScanned,
          unique_tag_names: new Set(tagsList.map(t => t.name)).size,
          total_tag_name_value_pairs: tagsList.length,
          tags: tagsList,
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Tool 3: bookstack_tags_audit
  // ---------------------------------------------------------------------------

  private createTagAuditTool(): MCPTool {
    return {
      name: 'bookstack_tags_audit',
      description:
        'Generate a tag coverage report for a BookStack content type. ' +
        'Shows which items are completely untagged, which are missing specific required tags, ' +
        'and a full tag inventory per item. Use to identify gaps and enforce tagging standards.',
      inputSchema: {
        type: 'object',
        required: ['content_type'],
        properties: {
          content_type: {
            type: 'string',
            enum: ['page', 'book', 'chapter', 'bookshelf'],
            description: 'Content type to audit.',
          },
          required_tag_names: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Tag names that every item should have. Items missing any of these are flagged. ' +
              "E.g. ['Content Type', 'Audience', 'Review Cycle']",
          },
          max_items: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 200,
            description: 'Max items to audit.',
          },
        },
      },
      handler: async (params: any) => {
        const ct = params.content_type as ContentTypeSingle;
        const required: string[] = (params.required_tag_names ?? []).map((n: string) => n.trim());
        const maxItems: number = params.max_items ?? 200;

        const items = await this.fetchAllPages(this.getListFn(ct), maxItems);

        let itemsNoTags = 0;
        let itemsMissingRequired = 0;

        const reportItems = items.map((item: any) => {
          const tags: Array<{ name: string; value: string }> = (item.tags ?? []).map(
            (t: any) => ({ name: t.name ?? '', value: t.value ?? '' })
          );
          const tagNamesPresent = new Set(tags.map(t => t.name));
          const missing = required.filter(n => !tagNamesPresent.has(n));
          const hasAll = missing.length === 0;

          if (!tags.length) itemsNoTags++;
          if (required.length && !hasAll) itemsMissingRequired++;

          return {
            id: item.id,
            name: item.name,
            tags,
            missing_required_tags: missing,
            has_all_required_tags: hasAll,
          };
        });

        return {
          content_type: ct,
          total_items_audited: reportItems.length,
          items_with_no_tags: itemsNoTags,
          required_tag_names: required,
          items_missing_required_tags: itemsMissingRequired,
          items: reportItems,
        };
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Tool 4: bookstack_tags_bulk_update
  // ---------------------------------------------------------------------------

  private createTagBulkUpdateTool(): MCPTool {
    return {
      name: 'bookstack_tags_bulk_update',
      description:
        'Add, update, or remove a tag across multiple BookStack items in a single operation. ' +
        'Always reads existing tags first (read-before-write) so no other tags are overwritten. ' +
        'Supports dry_run mode to preview changes before applying. ' +
        'Select items by explicit ID list or by filter tag (auto-select all that match). ' +
        'Note: uses a read-then-write pattern per item; concurrent edits by other users between ' +
        'the read and write could cause tag loss. For critical operations, use dry_run first and ' +
        'schedule during low-activity windows.',
      inputSchema: {
        type: 'object',
        required: ['content_type', 'operation', 'tag_name'],
        properties: {
          content_type: {
            type: 'string',
            enum: ['page', 'book', 'chapter', 'bookshelf'],
            description: 'Content type to update.',
          },
          operation: {
            type: 'string',
            enum: ['add', 'set', 'remove'],
            description:
              "'add': add the tag only if the name is not already present. " +
              "'set': add the tag if missing, or update its value if already present. " +
              "'remove': delete all tags with this name, regardless of value.",
          },
          tag_name: {
            type: 'string',
            minLength: 1,
            description: "Tag name to add/set/remove (e.g. 'Status', 'Priority').",
          },
          tag_value: {
            type: 'string',
            description:
              "Tag value. Required for 'add' and 'set' operations. Ignored for 'remove'.",
          },
          item_ids: {
            type: 'array',
            items: { type: 'integer' },
            description:
              'Explicit list of item IDs to update. ' +
              'Provide this OR filter_tag_name — not both.',
          },
          filter_tag_name: {
            type: 'string',
            description:
              'Auto-select all items that have a tag with this name. ' +
              'Used when item_ids is not provided.',
          },
          filter_tag_value: {
            type: 'string',
            description:
              "Narrow filter_tag_name selection: only select items where the tag also has this value. " +
              "E.g. filter_tag_name='Status', filter_tag_value='Placeholder'.",
          },
          dry_run: {
            type: 'boolean',
            default: false,
            description:
              'If true, show what would be changed without making any writes. ' +
              'Always test with dry_run=true first for large operations.',
          },
        },
      },
      handler: async (params: any) => {
        const ct = params.content_type as ContentTypeSingle;
        const operation = params.operation as BulkOperation;
        const tagName: string = params.tag_name;
        const tagValue: string | undefined = params.tag_value;
        const itemIds: number[] | undefined = params.item_ids;
        const filterTagName: string | undefined = params.filter_tag_name;
        const filterTagValue: string | undefined = params.filter_tag_value;
        const dryRun: boolean = params.dry_run ?? false;

        // Validate inputs
        if ((operation === 'add' || operation === 'set') && tagValue === undefined) {
          throw new Error(`tag_value is required for operation '${operation}'`);
        }
        if (!itemIds?.length && !filterTagName) {
          throw new Error(
            'Provide either item_ids (list of IDs) or filter_tag_name to select items to update.'
          );
        }

        const listFn = this.getListFn(ct);
        const getFn = this.getGetFn(ct);
        const updateFn = this.getUpdateFn(ct);

        // Resolve target IDs
        let idsToUpdate: number[];
        if (itemIds && itemIds.length > 0) {
          idsToUpdate = itemIds;
        } else {
          const allItems = await this.fetchAllPages(listFn, 500);
          idsToUpdate = allItems
            .filter((item: any) =>
              (item.tags ?? []).some(
                (t: any) =>
                  t.name === filterTagName &&
                  (filterTagValue === undefined || t.value === filterTagValue)
              )
            )
            .map((item: any) => item.id as number);
        }

        if (idsToUpdate.length === 0) {
          return { status: 'no_items_found', items_updated: 0, details: [] };
        }

        this.logger.info('Bulk tag update', {
          ct,
          operation,
          tagName,
          tagValue,
          count: idsToUpdate.length,
          dryRun,
        });

        const details: any[] = [];

        for (const itemId of idsToUpdate) {
          const current = await getFn(itemId);
          const originalTags: Array<{ name: string; value: string }> = (
            current.tags ?? []
          ).map((t: any) => ({ name: t.name ?? '', value: t.value ?? '' }));

          const newTags = this.applyTagOperation(originalTags, operation, tagName, tagValue);
          const changed = JSON.stringify(newTags) !== JSON.stringify(originalTags);

          if (!dryRun && changed) {
            await updateFn(itemId, { tags: newTags });
          }

          details.push({
            id: itemId,
            changed,
            dry_run: dryRun,
            tags_before: originalTags,
            tags_after: newTags,
          });
        }

        return {
          operation,
          tag_name: tagName,
          tag_value: tagValue,
          content_type: ct,
          dry_run: dryRun,
          items_selected: idsToUpdate.length,
          items_changed: details.filter(d => d.changed).length,
          items_unchanged: details.filter(d => !d.changed).length,
          details,
        };
      },
    };
  }
}

export default TagTools;
