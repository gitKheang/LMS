import { environment } from "../../../environments/environment";

/**
 * API Configuration
 * Base URL for the backend API server
 */
export const API_CONFIG = {
  baseUrl: environment.apiUrl,
} as const;
