import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { ExhibitorProfile, BoothLocation, BoothApplication } from '@/types/exhibitor';

class ExhibitorProfileService {
  async getMyProfile(): Promise<ServiceResult<ExhibitorProfile | null>> {
    const result = await api.get<ExhibitorProfile>('/exhibitors/profile');
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data ?? null, error: null };
  }

  async createOrUpdate(input: Partial<ExhibitorProfile>): Promise<ServiceResult<ExhibitorProfile>> {
    const result = await api.post<ExhibitorProfile>('/exhibitors/profile', input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

class BoothLocationService {
  async getByEdition(editionId: string): Promise<ServiceResult<BoothLocation[]>> {
    const result = await api.get<BoothLocation[]>(`/exhibitors/edition/${editionId}/locations`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<BoothLocation>): Promise<ServiceResult<BoothLocation>> {
    const result = await api.post<BoothLocation>(`/exhibitors/edition/${editionId}/locations`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<BoothLocation>): Promise<ServiceResult<BoothLocation>> {
    const result = await api.put<BoothLocation>(`/exhibitors/locations/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/exhibitors/locations/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

class BoothApplicationService {
  async getByEdition(editionId: string, statusFilter?: string): Promise<ServiceResult<BoothApplication[]>> {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const result = await api.get<BoothApplication[]>(`/exhibitors/edition/${editionId}/applications${qs}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async apply(editionId: string, input: Partial<BoothApplication>): Promise<ServiceResult<BoothApplication>> {
    const result = await api.post<BoothApplication>(`/exhibitors/edition/${editionId}/apply`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async updateStatus(id: string, status: string, notes?: string): Promise<ServiceResult<BoothApplication>> {
    const result = await api.put<BoothApplication>(`/exhibitors/applications/${id}/status`, { status, review_notes: notes });
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async assignBooth(applicationId: string, boothId: string): Promise<ServiceResult<BoothApplication>> {
    const result = await api.put<BoothApplication>(`/exhibitors/applications/${applicationId}/assign-booth`, { booth_id: boothId });
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

export const exhibitorProfileService = new ExhibitorProfileService();
export const boothLocationService = new BoothLocationService();
export const boothApplicationService = new BoothApplicationService();
