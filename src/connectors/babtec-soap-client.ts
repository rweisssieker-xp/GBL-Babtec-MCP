import axios, { AxiosInstance } from 'axios';
import type { Endpoint, Credentials } from '../config/schema.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { BabtecAPIError } from '../utils/errors.js';

/**
 * SOAP Client for BabtecQ SOAP endpoints
 * Note: This is a basic implementation. For production, consider using a proper SOAP library.
 */
export class BabtecSOAPClient {
  private axiosInstance: AxiosInstance;
  private credentials: Credentials;
  private circuitBreaker: CircuitBreaker;
  private baseUrl: string;

  constructor(
    endpoint: Endpoint,
    credentials: Credentials,
    circuitBreaker: CircuitBreaker
  ) {
    this.credentials = credentials;
    this.circuitBreaker = circuitBreaker;
    this.baseUrl = endpoint.baseUrl;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: endpoint.timeout || 30000,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '',
        ...this.getAuthHeaders(),
      },
    });
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // SOAP typically uses WS-Security for authentication
    if (this.credentials.type === 'soap-wsse') {
      // WS-Security headers would be added here
      // For now, basic auth in header
      if (this.credentials.username && this.credentials.password) {
        const auth = Buffer.from(
          `${this.credentials.username}:${this.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
    }

    return headers;
  }

  private buildSOAPEnvelope(action: string, body: Record<string, unknown>): string {
    // Build SOAP envelope
    const bodyXml = Object.entries(body)
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <!-- WS-Security headers would go here -->
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <${action}>
      ${bodyXml}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
  }

  async call<T>(
    action: string,
    body: Record<string, unknown>
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      try {
        const soapEnvelope = this.buildSOAPEnvelope(action, body);
        const response = await this.axiosInstance.post<string>(
          '',
          soapEnvelope,
          {
            headers: {
              SOAPAction: `"${action}"`,
            },
          }
        );

        // Parse SOAP response (simplified - would need proper XML parsing)
        // For now, return as-is
        return response.data as unknown as T;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'Unknown SOAP API error';

      return new BabtecAPIError(message, status, undefined, error.response?.data);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred');
  }
}

