import { apiClient } from '@/lib/api';
import axios from 'axios';
import {
  ApiKeyItem,
  CreateApiKeyPayload,
  CreateApiKeyResult,
  PublicApiScopeDefinition,
} from '@dispenco/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const integrationsApi = {
  /**
   * List all API keys configured for the current tenant
   */
  async listKeys(): Promise<ApiKeyItem[]> {
    const res = await apiClient.get<ApiKeyItem[]>('/integrations/api-keys');
    return res.data;
  },

  /**
   * Create a new integration API key and retrieve the one-time raw secret
   */
  async createKey(payload: CreateApiKeyPayload): Promise<CreateApiKeyResult> {
    const res = await apiClient.post<CreateApiKeyResult>(
      '/integrations/api-keys',
      payload
    );
    return res.data;
  },

  /**
   * Toggle an API key active / suspended
   */
  async toggleKey(id: string): Promise<ApiKeyItem> {
    const res = await apiClient.patch<ApiKeyItem>(
      `/integrations/api-keys/${id}/toggle`
    );
    return res.data;
  },

  /**
   * Revoke an API key permanently
   */
  async deleteKey(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/integrations/api-keys/${id}`
    );
    return res.data;
  },

  /**
   * Retrieve all supported public API scopes with explanations
   */
  async getScopes(): Promise<PublicApiScopeDefinition[]> {
    const res = await apiClient.get<PublicApiScopeDefinition[]>(
      '/integrations/scopes'
    );
    return res.data;
  },

  /**
   * Retrieve complete OpenAPI 3.0 specification JSON
   */
  async getOpenApiSpec(): Promise<Record<string, unknown>> {
    const res = await apiClient.get<Record<string, unknown>>(
      '/integrations/spec'
    );
    return res.data;
  },

  /**
   * Test a public API endpoint using the provided API key (Playground client)
   */
  async testPublicEndpoint(
    endpoint: string,
    apiKey: string,
    params?: Record<string, string | number | boolean>
  ): Promise<{
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    data: unknown;
  }> {
    const startTime = performance.now();
    try {
      const response = await axios.get(`${API_BASE_URL}/public/v1${endpoint}`, {
        headers: {
          'x-api-key': apiKey.trim(),
        },
        params,
        validateStatus: () => true, // Don't throw so we capture 4xx/5xx responses nicely in playground
      });

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: response.status,
        statusText: response.statusText,
        durationMs,
        headers: {
          'x-ratelimit-limit': response.headers['x-ratelimit-limit'] || '60',
          'x-ratelimit-remaining':
            response.headers['x-ratelimit-remaining'] || 'N/A',
          'x-ratelimit-reset': response.headers['x-ratelimit-reset'] || 'N/A',
        },
        data: response.data,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        status: err.response?.status || 500,
        statusText: err.response?.statusText || 'Network Error',
        durationMs,
        headers: {},
        data: err.response?.data || { error: err.message },
      };
    }
  },
};
