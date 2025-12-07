import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Config, Endpoint, Credentials } from '../config/schema.js';
import { CircuitBreaker, CircuitState } from './circuit-breaker.js';
import { BabtecAPIError, AuthenticationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export interface ApiVersionInfo {
  version: string;
  supportedVersions?: string[];
  endpoint: string;
}

export class BabtecClient {
  private axiosInstance?: AxiosInstance;
  private endpoint: Endpoint;
  private credentials: Credentials;
  private circuitBreaker: CircuitBreaker;
  private detectedVersion?: string;
  private baseUrl: string;
  private isSOAP: boolean;

  constructor(config: Config, endpointName?: string) {
    const endpoint = config.babtec.endpoints.find(
      (e) => e.name === (endpointName || config.babtec.defaultEndpoint)
    );

    if (!endpoint) {
      throw new Error(`Endpoint "${endpointName || config.babtec.defaultEndpoint}" not found`);
    }

    this.endpoint = endpoint;
    this.credentials = config.babtec.credentials;
    this.baseUrl = endpoint.baseUrl;
    this.isSOAP = endpoint.type === 'babtecq-soap';

    // Setup circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.security.circuitBreaker.failureThreshold,
      resetTimeout: config.security.circuitBreaker.resetTimeout,
      enabled: config.security.circuitBreaker.enabled,
    });

    // Initialize appropriate client
    if (this.isSOAP) {
      // SOAP client would be used for SOAP-specific operations
      // For now, we'll handle SOAP through a different approach if needed
      // const soapClient = new BabtecSOAPClient(endpoint, this.credentials, this.circuitBreaker);
    } else {
      // Create axios instance for REST
      this.axiosInstance = axios.create({
        baseURL: this.baseUrl,
        timeout: endpoint.timeout || 30000,
        headers: this.getAuthHeaders(),
      });

      // Setup interceptors
      this.setupInterceptors();
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.credentials.type) {
      case 'basic':
        if (this.credentials.username && this.credentials.password) {
          const auth = Buffer.from(
            `${this.credentials.username}:${this.credentials.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
        break;
      case 'bearer':
        if (this.credentials.token) {
          headers['Authorization'] = `Bearer ${this.credentials.token}`;
        }
        break;
      case 'api-key':
        const headerName = this.credentials.apiKeyHeader || 'X-API-Key';
        if (this.credentials.apiKey) {
          headers[headerName] = this.credentials.apiKey;
        }
        break;
    }

    return headers;
  }

  private setupInterceptors(): void {
    if (!this.axiosInstance) {
      return;
    }

    // Request interceptor - add version header if detected
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.detectedVersion) {
        config.headers['X-API-Version'] = this.detectedVersion as string;
      }
      return config;
    });

    // Response interceptor - handle token refresh, version detection
    this.axiosInstance!.interceptors.response.use(
      (response) => {
        // Check for version in response headers
        const versionHeader = response.headers['x-api-version'];
        if (versionHeader && !this.detectedVersion) {
          this.detectedVersion = versionHeader;
          logger.info('API version detected', { version: versionHeader });
        }
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - try to refresh
          // For now, throw authentication error
          throw new AuthenticationError('Authentication failed - token may be expired');
        }
        throw error;
      }
    );
  }

  async detectVersion(): Promise<string> {
    if (this.detectedVersion) {
      return this.detectedVersion;
    }

    if (this.isSOAP || !this.axiosInstance) {
      // For SOAP or if REST client not initialized, use configured version
      this.detectedVersion = this.endpoint.apiVersion || 'v1';
      return this.detectedVersion;
    }

    try {
      // Try version endpoint
      const response = await this.axiosInstance.get<{ version?: string }>('/api/version');
      if (response.data?.version && typeof response.data.version === 'string') {
        this.detectedVersion = response.data.version;
        return this.detectedVersion;
      }
    } catch (error) {
      logger.warn('Version detection failed, using configured version', { error });
    }

    // Fallback to configured version or default
    this.detectedVersion = this.endpoint.apiVersion || 'v1';
    return this.detectedVersion;
  }

  async negotiateVersion(supportedVersions: string[]): Promise<string> {
    const detected = await this.detectVersion();

    if (supportedVersions.length === 0) {
      return detected;
    }

    if (supportedVersions.includes(detected)) {
      return detected;
    }

    // Try to find compatible version (semver matching)
    for (const supported of supportedVersions) {
      if (this.isVersionCompatible(detected, supported)) {
        logger.info('Version negotiation successful', {
          detected,
          using: supported,
        });
        return supported;
      }
    }

    // Fallback to last known working version or detected
    logger.warn('Version negotiation failed, using detected version', {
      detected,
      supported: supportedVersions,
    });
    return detected;
  }

  private isVersionCompatible(apiVersion: string, supportedVersion: string): boolean {
    // Simple version matching - can be enhanced with semver
    const apiMajor = apiVersion.split('.')[0];
    const supportedMajor = supportedVersion.split('.')[0];
    return apiMajor === supportedMajor;
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    if (this.isSOAP) {
      throw new Error('GET requests not supported for SOAP endpoints');
    }

    if (!this.axiosInstance) {
      throw new Error('REST client not initialized');
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.axiosInstance!.get<T>(path, { params });
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    if (this.isSOAP) {
      throw new Error('POST requests not supported for SOAP endpoints - use call() method');
    }

    if (!this.axiosInstance) {
      throw new Error('REST client not initialized');
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.axiosInstance!.post<T>(path, data);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    if (this.isSOAP) {
      throw new Error('PUT requests not supported for SOAP endpoints - use call() method');
    }

    if (!this.axiosInstance) {
      throw new Error('REST client not initialized');
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.axiosInstance!.put<T>(path, data);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async delete<T>(path: string): Promise<T> {
    if (this.isSOAP) {
      throw new Error('DELETE requests not supported for SOAP endpoints - use call() method');
    }

    if (!this.axiosInstance) {
      throw new Error('REST client not initialized');
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.axiosInstance!.delete<T>(path);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const message =
        (axiosError.response?.data as { message?: string })?.message ||
        axiosError.message ||
        'Unknown API error';

      return new BabtecAPIError(message, status, undefined, axiosError.response?.data);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred');
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  getDetectedVersion(): string | undefined {
    return this.detectedVersion;
  }
}

