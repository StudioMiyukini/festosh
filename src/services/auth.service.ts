import { api } from '@/lib/api-client';
import type { ServiceResult } from './base.service';
import { ServiceError } from './base.service';
import type { Profile, UserDocument } from '@/stores/auth-store';
import type { UserType, DocumentType } from '@/types/enums';

interface AuthResponse {
  token: string;
  user: Profile;
}

interface SignUpData {
  email: string;
  password: string;
  username: string;
  user_type: UserType;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  company_name?: string;
  category?: string;
  legal_form?: string;
  registration_number?: string;
  siret?: string;
  insurer_name?: string;
  insurance_contract_number?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  social_links?: string[];
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
}

class AuthService {
  /** Sign up with email, password, and user type */
  async signUp(data: SignUpData): Promise<ServiceResult<{ userId: string }>> {
    const result = await api.post<AuthResponse>('/auth/register', data);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Registration failed', 'AUTH_SIGNUP_ERROR') };
    }

    api.setToken(result.data.token);
    return { data: { userId: result.data.user.id }, error: null };
  }

  /** Sign in with email and password */
  async signIn(email: string, password: string): Promise<ServiceResult<{ userId: string }>> {
    const result = await api.post<AuthResponse>('/auth/login', { email, password });

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Login failed', 'AUTH_SIGNIN_ERROR') };
    }

    api.setToken(result.data.token);
    return { data: { userId: result.data.user.id }, error: null };
  }

  /** Sign out - calls backend to blacklist JWT, then clears local token */
  async signOut(): Promise<ServiceResult<null>> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors - we still want to clear local state
    }
    api.setToken(null);
    return { data: null, error: null };
  }

  /** Get current user's profile */
  async getProfile(): Promise<ServiceResult<Profile>> {
    const result = await api.get<Profile>('/auth/me');

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to get profile', 'PROFILE_ERROR') };
    }

    return { data: result.data, error: null };
  }

  /** Update current user's profile */
  async updateProfile(input: Partial<Profile>): Promise<ServiceResult<Profile>> {
    const result = await api.put<Profile>('/auth/me', input);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to update profile', 'PROFILE_UPDATE_ERROR') };
    }

    return { data: result.data, error: null };
  }

  /** Change password */
  async changePassword(oldPassword: string, newPassword: string): Promise<ServiceResult<null>> {
    const result = await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });

    if (!result.success) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to change password', 'PASSWORD_ERROR') };
    }

    return { data: null, error: null };
  }

  /** Upload a document */
  async uploadDocument(file: File, documentType: DocumentType, label?: string): Promise<ServiceResult<UserDocument>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (label) formData.append('label', label);

    const result = await api.uploadFile<UserDocument>('/uploads', formData);

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Upload failed', 'UPLOAD_ERROR') };
    }

    return { data: result.data, error: null };
  }

  /** List current user's documents */
  async getDocuments(): Promise<ServiceResult<UserDocument[]>> {
    const result = await api.get<UserDocument[]>('/uploads');

    if (!result.success || !result.data) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to list documents', 'DOCUMENTS_ERROR') };
    }

    return { data: result.data, error: null };
  }

  /** Delete a document */
  async deleteDocument(id: string): Promise<ServiceResult<null>> {
    const result = await api.delete(`/uploads/${id}`);

    if (!result.success) {
      return { data: null, error: ServiceError.fromMessage(result.error || 'Failed to delete document', 'DELETE_ERROR') };
    }

    return { data: null, error: null };
  }

  /** Get download URL for a document */
  getDocumentDownloadUrl(id: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return `${baseUrl}/uploads/${id}/download`;
  }
}

export const authService = new AuthService();
