import { api, ApiClient } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { Festival } from '@/types/festival';

export interface DirectoryFilters {
  search?: string;
  tags?: string[];
  city?: string;
  country?: string;
  sortBy?: 'name' | 'date' | 'city' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DirectoryResult {
  festivals: Festival[];
  total: number;
  hasMore: boolean;
}

class DirectoryService {
  /** Search and filter published festivals */
  async search(filters: DirectoryFilters = {}): Promise<ServiceResult<DirectoryResult>> {
    const qs = ApiClient.queryString({
      search: filters.search,
      tags: filters.tags,
      city: filters.city,
      sort: filters.sortBy,
      order: filters.sortOrder,
      limit: filters.limit,
      offset: filters.offset,
    });

    const result = await api.get<Festival[]>(`/directory${qs}`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Search failed') };
    }

    return {
      data: {
        festivals: result.data,
        total: result.pagination?.total ?? result.data.length,
        hasMore: result.pagination
          ? result.pagination.total > (result.pagination.offset + result.pagination.limit)
          : false,
      },
      error: null,
    };
  }

  /** Get available tags */
  async getAvailableTags(): Promise<ServiceResult<string[]>> {
    const result = await api.get<string[]>('/directory/tags');

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to get tags') };
    }
    return { data: result.data, error: null };
  }

  /** Get available cities */
  async getAvailableCities(): Promise<ServiceResult<string[]>> {
    const result = await api.get<string[]>('/directory/cities');

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to get cities') };
    }
    return { data: result.data, error: null };
  }
}

export const directoryService = new DirectoryService();
