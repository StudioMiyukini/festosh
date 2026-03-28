import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { EquipmentItem, EquipmentAssignment } from '@/types/equipment';

class EquipmentItemService {
  async getByFestival(festivalId: string): Promise<ServiceResult<EquipmentItem[]>> {
    const result = await api.get<EquipmentItem[]>(`/equipment/festival/${festivalId}/items`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<EquipmentItem>): Promise<ServiceResult<EquipmentItem>> {
    const result = await api.post<EquipmentItem>(`/equipment/festival/${festivalId}/items`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<EquipmentItem>): Promise<ServiceResult<EquipmentItem>> {
    const result = await api.put<EquipmentItem>(`/equipment/items/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/equipment/items/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

class EquipmentAssignmentService {
  async getByEdition(editionId: string): Promise<ServiceResult<EquipmentAssignment[]>> {
    const result = await api.get<EquipmentAssignment[]>(`/equipment/edition/${editionId}/assignments`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<EquipmentAssignment>): Promise<ServiceResult<EquipmentAssignment>> {
    const result = await api.post<EquipmentAssignment>(`/equipment/edition/${editionId}/assignments`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<EquipmentAssignment>): Promise<ServiceResult<EquipmentAssignment>> {
    const result = await api.put<EquipmentAssignment>(`/equipment/assignments/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

export const equipmentItemService = new EquipmentItemService();
export const equipmentAssignmentService = new EquipmentAssignmentService();
