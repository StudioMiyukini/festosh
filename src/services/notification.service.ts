import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { Notification } from '@/types/notification';

class NotificationService {
  async getByUser(options?: { limit?: number; unreadOnly?: boolean }): Promise<ServiceResult<Notification[]>> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.unreadOnly) params.set('unread', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';

    const result = await api.get<Notification[]>(`/notifications${qs}`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async markRead(id: string): Promise<ServiceResult<null>> {
    const result = await api.put(`/notifications/${id}/read`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async markAllRead(): Promise<ServiceResult<null>> {
    const result = await api.put('/notifications/read-all');
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/notifications/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }
}

export const notificationService = new NotificationService();
