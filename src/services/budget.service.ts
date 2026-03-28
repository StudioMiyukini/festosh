import { api } from '@/lib/api-client';
import { ServiceError } from './base.service';
import type { ServiceResult } from './base.service';
import type { BudgetCategory, BudgetEntry } from '@/types/budget';

class BudgetCategoryService {
  async getByFestival(festivalId: string): Promise<ServiceResult<BudgetCategory[]>> {
    const result = await api.get<BudgetCategory[]>(`/budget/festival/${festivalId}/categories`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(festivalId: string, input: Partial<BudgetCategory>): Promise<ServiceResult<BudgetCategory>> {
    const result = await api.post<BudgetCategory>(`/budget/festival/${festivalId}/categories`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

class BudgetEntryService {
  async getByEdition(editionId: string): Promise<ServiceResult<BudgetEntry[]>> {
    const result = await api.get<BudgetEntry[]>(`/budget/edition/${editionId}/entries`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async create(editionId: string, input: Partial<BudgetEntry>): Promise<ServiceResult<BudgetEntry>> {
    const result = await api.post<BudgetEntry>(`/budget/edition/${editionId}/entries`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async update(id: string, input: Partial<BudgetEntry>): Promise<ServiceResult<BudgetEntry>> {
    const result = await api.put<BudgetEntry>(`/budget/entries/${id}`, input);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }

  async delete(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/budget/entries/${id}`);
    if (!result.success) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: null, error: null };
  }

  async getSummary(editionId: string): Promise<ServiceResult<{ totalIncome: number; totalExpenses: number; balance: number }>> {
    const result = await api.get<{ totalIncome: number; totalExpenses: number; balance: number }>(`/budget/edition/${editionId}/summary`);
    if (!result.success || !result.data) return { data: null, error: ServiceError.fromMessage(result.error || 'Failed') };
    return { data: result.data, error: null };
  }
}

export const budgetCategoryService = new BudgetCategoryService();
export const budgetEntryService = new BudgetEntryService();
