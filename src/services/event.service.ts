import { api, ApiClient } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { Event, Venue } from '@/types/programming';

class EventService {
  async getByEdition(editionId: string, options?: { venueId?: string; category?: string; date?: string }): Promise<ServiceResult<Event[]>> {
    const qs = ApiClient.queryString({ venue: options?.venueId, category: options?.category, date: options?.date });
    const result = await api.get<Event[]>(`/events/edition/${editionId}${qs}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<Event>): Promise<ServiceResult<Event>> {
    const result = await api.post<Event>(`/events/edition/${editionId}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<Event>): Promise<ServiceResult<Event>> {
    const result = await api.put<Event>(`/events/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/events/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

class VenueService {
  async getByFestival(festivalId: string): Promise<ServiceResult<Venue[]>> {
    const result = await api.get<Venue[]>(`/venues/festival/${festivalId}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<Venue>): Promise<ServiceResult<Venue>> {
    const result = await api.post<Venue>(`/venues/festival/${festivalId}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<Venue>): Promise<ServiceResult<Venue>> {
    const result = await api.put<Venue>(`/venues/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/venues/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const eventService = new EventService();
export const venueService = new VenueService();
