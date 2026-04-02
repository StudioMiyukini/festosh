import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { CmsPage, CmsBlock, CmsNavItem } from '@/types/cms';

class CmsPageService {
  async getByFestival(festivalId: string): Promise<ServiceResult<CmsPage[]>> {
    const result = await api.get<CmsPage[]>(`/cms/festival/${festivalId}/pages`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async getById(id: string): Promise<ServiceResult<CmsPage & { blocks: CmsBlock[] }>> {
    const result = await api.get<CmsPage & { blocks: CmsBlock[] }>(`/cms/pages/${id}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async getBySlug(festivalId: string, slug: string): Promise<ServiceResult<CmsPage & { blocks: CmsBlock[] }>> {
    const result = await api.get<CmsPage & { blocks: CmsBlock[] }>(`/cms/festival/${festivalId}/pages/by-slug/${slug}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Page not found') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<CmsPage>): Promise<ServiceResult<CmsPage>> {
    const result = await api.post<CmsPage>(`/cms/festival/${festivalId}/pages`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<CmsPage>): Promise<ServiceResult<CmsPage>> {
    const result = await api.put<CmsPage>(`/cms/pages/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/cms/pages/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async initializeDefaults(festivalId: string): Promise<ServiceResult<{ created_pages: number }>> {
    const result = await api.post<{ created_pages: number }>(`/cms/festival/${festivalId}/pages/initialize-defaults`, {});
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data ?? { created_pages: 0 }, error: null };
  }
}

class CmsBlockService {
  async create(pageId: string, input: Partial<CmsBlock>): Promise<ServiceResult<CmsBlock>> {
    const result = await api.post<CmsBlock>(`/cms/pages/${pageId}/blocks`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<CmsBlock>): Promise<ServiceResult<CmsBlock>> {
    const result = await api.put<CmsBlock>(`/cms/blocks/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/cms/blocks/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async reorder(pageId: string, blockIds: string[]): Promise<ServiceResult<CmsBlock[]>> {
    const result = await api.put<CmsBlock[]>(`/cms/pages/${pageId}/blocks/reorder`, { block_ids: blockIds });
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data ?? [], error: null };
  }
}

class CmsNavigationService {
  async getByFestival(festivalId: string): Promise<ServiceResult<CmsNavItem[]>> {
    const result = await api.get<CmsNavItem[]>(`/cms/festival/${festivalId}/navigation`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<CmsNavItem>): Promise<ServiceResult<CmsNavItem>> {
    const result = await api.post<CmsNavItem>(`/cms/festival/${festivalId}/navigation`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<CmsNavItem>): Promise<ServiceResult<CmsNavItem>> {
    const result = await api.put<CmsNavItem>(`/cms/navigation/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/cms/navigation/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async reorder(festivalId: string, items: Array<{ id: string; sort_order: number; parent_id?: string | null }>): Promise<ServiceResult<null>> {
    const result = await api.put(`/cms/festival/${festivalId}/navigation/reorder`, { items });
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const cmsPageService = new CmsPageService();
export const cmsBlockService = new CmsBlockService();
export const cmsNavigationService = new CmsNavigationService();
