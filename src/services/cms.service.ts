import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { CmsPage, CmsBlock } from '@/types/cms';

class CmsPageService {
  async getByFestival(festivalId: string): Promise<ServiceResult<CmsPage[]>> {
    const result = await api.get<CmsPage[]>(`/cms/festival/${festivalId}/pages`);
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

  async reorder(pageId: string, blockIds: string[]): Promise<ServiceResult<null>> {
    const result = await api.put(`/cms/pages/${pageId}/blocks/reorder`, { blockIds });
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const cmsPageService = new CmsPageService();
export const cmsBlockService = new CmsBlockService();
