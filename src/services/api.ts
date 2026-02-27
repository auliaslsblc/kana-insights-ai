const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

const normalizedApiBaseUrl = rawApiBaseUrl?.trim()
  ? rawApiBaseUrl.trim().replace(/\/+$/, '')
  : '';

export function buildApiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('API path must start with "/"');
  }

  return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${path}` : path;
}
