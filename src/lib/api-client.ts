/**
 * HTTP API client for communicating with the Hono backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

class ApiClient {
  private token: string | null = null;

  /** Set the JWT token for authenticated requests */
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('festosh-token', token);
    } else {
      localStorage.removeItem('festosh-token');
    }
  }

  /** Get the current token */
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('festosh-token');
    }
    return this.token;
  }

  /** Build headers with optional auth */
  private headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** Generic request method */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const json: ApiResponse<T> = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: json.error || `HTTP ${response.status}`,
        };
      }

      return json;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /** GET request */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }

  /** POST request */
  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  /** PUT request */
  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  /** DELETE request */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  /** Upload a file via multipart/form-data */
  async uploadFile<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — browser sets it with boundary for FormData

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const json: ApiResponse<T> = await response.json();

      if (!response.ok) {
        return { success: false, error: json.error || `HTTP ${response.status}` };
      }

      return json;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  /** Build query string from params */
  static queryString(params: Record<string, string | number | boolean | string[] | undefined>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }
}

export const api = new ApiClient();
export { ApiClient };
export type { ApiResponse };
