import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { VolunteerRole, Shift, ShiftAssignment } from '@/types/volunteer';

class VolunteerRoleService {
  async getByFestival(festivalId: string): Promise<ServiceResult<VolunteerRole[]>> {
    const result = await api.get<VolunteerRole[]>(`/volunteers/festival/${festivalId}/roles`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<VolunteerRole>): Promise<ServiceResult<VolunteerRole>> {
    const result = await api.post<VolunteerRole>(`/volunteers/festival/${festivalId}/roles`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

class ShiftService {
  async getByEdition(editionId: string): Promise<ServiceResult<Shift[]>> {
    const result = await api.get<Shift[]>(`/volunteers/edition/${editionId}/shifts`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<Shift>): Promise<ServiceResult<Shift>> {
    const result = await api.post<Shift>(`/volunteers/edition/${editionId}/shifts`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<Shift>): Promise<ServiceResult<Shift>> {
    const result = await api.put<Shift>(`/volunteers/shifts/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async getMyShifts(editionId: string): Promise<ServiceResult<Shift[]>> {
    const result = await api.get<Shift[]>(`/volunteers/my-shifts/${editionId}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async assign(shiftId: string, userId: string): Promise<ServiceResult<ShiftAssignment>> {
    const result = await api.post<ShiftAssignment>(`/volunteers/shifts/${shiftId}/assign`, { user_id: userId });
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async unassign(shiftId: string, userId: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/volunteers/shifts/${shiftId}/assign/${userId}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const volunteerRoleService = new VolunteerRoleService();
export const shiftService = new ShiftService();
