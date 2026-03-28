import { api } from '@/lib/api-client';
import type { ServiceResult } from './base.service';
import { ServiceError } from './base.service';
import type { Profile } from '@/stores/auth-store';

interface AuthResponse {
  token: string;
  user: Profile;
}

class AuthService {
  /** Sign up with email and password */
  async signUp(email: string, password: string, username: string): Promise<ServiceResult<{ userId: string }>> {
    const result = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      username,
    });

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

  /** Sign out */
  async signOut(): Promise<ServiceResult<null>> {
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
}

export const authService = new AuthService();
