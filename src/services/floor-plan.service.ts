import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { FloorPlan } from '@/types/venue';

class FloorPlanService {
  async getByEdition(editionId: string): Promise<ServiceResult<FloorPlan[]>> {
    const result = await api.get<FloorPlan[]>(`/floor-plans/edition/${editionId}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async getById(id: string): Promise<ServiceResult<FloorPlan>> {
    const result = await api.get<FloorPlan>(`/floor-plans/${id}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<FloorPlan>): Promise<ServiceResult<FloorPlan>> {
    const result = await api.post<FloorPlan>(`/floor-plans/edition/${editionId}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async saveCanvas(id: string, canvasData: Record<string, unknown>): Promise<ServiceResult<FloorPlan>> {
    const result = await api.put<FloorPlan>(`/floor-plans/${id}/canvas`, { canvas_data: canvasData });
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/floor-plans/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const floorPlanService = new FloorPlanService();
