import { apiRequest, ApiClientError } from './api-client';

export type IntegrationSource = 'database' | 'environment' | 'none' | 'disabled';

export type IntegrationConfig = {
  provider: string;
  label: string;
  category: string;
  enabled: boolean;
  configured: boolean;
  source: IntegrationSource;
  secretPreview: string;
  model: string;
  endpoint: string;
  notes: string;
  builtIn: boolean;
  updatedAt: string | null;
};

export type IntegrationSaveBody = {
  label: string;
  category: string;
  enabled: boolean;
  secret?: string;
  clearSecret?: boolean;
  model?: string;
  endpoint?: string;
  notes?: string;
};

export type IntegrationTestResult = {
  provider: string;
  ready: boolean;
  source: IntegrationSource;
  message: string;
};

export async function fetchIntegrationConfigs(accessToken: string): Promise<IntegrationConfig[]> {
  return apiRequest<IntegrationConfig[]>('/admin/integrations', { token: accessToken });
}

export async function saveIntegrationConfig(accessToken: string, provider: string, body: IntegrationSaveBody): Promise<IntegrationConfig> {
  return apiRequest<IntegrationConfig>(`/admin/integrations/${provider}`, {
    method: 'PUT',
    token: accessToken,
    body: JSON.stringify(body),
  });
}

export async function testIntegrationConfig(accessToken: string, provider: string): Promise<IntegrationTestResult> {
  return apiRequest<IntegrationTestResult>(`/admin/integrations/${provider}/test`, {
    method: 'POST',
    token: accessToken,
  });
}

export async function deleteIntegrationConfig(accessToken: string, provider: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/admin/integrations/${provider}`, {
    method: 'DELETE',
    token: accessToken,
  });
}

export function isExpiredIntegrationAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 && /expired|unauthorized|authentication|invalid access token/i.test(error.message);
  }
  return false;
}
