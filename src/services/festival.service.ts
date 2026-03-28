import { api, ApiClient } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { Festival, Edition, FestivalMember } from '@/types/festival';

class FestivalService {
  /** Get festivals the current user is a member of */
  async getMyFestivals(): Promise<ServiceResult<(FestivalMember & { festival: Festival })[]>> {
    const result = await api.get<(FestivalMember & { festival: Festival })[]>('/festivals');

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to fetch festivals') };
    }
    return { data: result.data, error: null };
  }

  /** Create a new festival */
  async createFestival(input: { name: string; slug: string; description?: string }): Promise<ServiceResult<Festival>> {
    const result = await api.post<Festival>('/festivals', input);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to create festival') };
    }
    return { data: result.data, error: null };
  }

  /** Get festival by ID */
  async getById(id: string): Promise<ServiceResult<Festival>> {
    const result = await api.get<Festival>(`/festivals/${id}`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Festival not found') };
    }
    return { data: result.data, error: null };
  }

  /** Resolve festival from subdomain slug */
  async getBySlug(slug: string): Promise<ServiceResult<Festival>> {
    const result = await api.get<Festival>(`/directory/by-slug/${slug}`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Festival not found') };
    }
    return { data: result.data, error: null };
  }

  /** Update festival */
  async update(id: string, input: Partial<Festival>): Promise<ServiceResult<Festival>> {
    const result = await api.put<Festival>(`/festivals/${id}`, input);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to update festival') };
    }
    return { data: result.data, error: null };
  }

  /** Get members of a festival */
  async getMembers(festivalId: string): Promise<ServiceResult<FestivalMember[]>> {
    const result = await api.get<FestivalMember[]>(`/festivals/${festivalId}/members`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to fetch members') };
    }
    return { data: result.data, error: null };
  }

  /** Get user's role in a festival */
  async getUserRole(festivalId: string): Promise<ServiceResult<string | null>> {
    const result = await api.get<{ role: string | null }>(`/festivals/${festivalId}/my-role`);

    if (!result.success) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to get role') };
    }
    return { data: result.data?.role ?? null, error: null };
  }
}

class EditionService {
  /** Get the active edition for a festival */
  async getActive(festivalId: string): Promise<ServiceResult<Edition | null>> {
    const result = await api.get<Edition[]>(`/editions/festival/${festivalId}`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to fetch editions') };
    }

    const active = result.data.find((e) => e.is_active) ?? result.data[0] ?? null;
    return { data: active, error: null };
  }

  /** Get all editions for a festival */
  async getByFestival(festivalId: string): Promise<ServiceResult<Edition[]>> {
    const result = await api.get<Edition[]>(`/editions/festival/${festivalId}`);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to fetch editions') };
    }
    return { data: result.data, error: null };
  }

  /** Create a new edition */
  async create(festivalId: string, input: Partial<Edition>): Promise<ServiceResult<Edition>> {
    const result = await api.post<Edition>(`/editions/festival/${festivalId}`, input);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to create edition') };
    }
    return { data: result.data, error: null };
  }
}

export const festivalService = new FestivalService();
export const editionService = new EditionService();
