/**
 * Mercury Bank API Service
 * 
 * Provides integration with Mercury Bank's API for:
 * - Account information and balances
 * - Transaction history
 * - Recipients management
 * 
 * API Documentation: https://docs.mercury.com/reference/welcome-to-mercury-api
 */

export interface MercuryAccount {
  id: string;
  name: string;
  status: string;
  type: string;
  routingNumber: string;
  accountNumber: string;
  currentBalance: number;
  availableBalance: number;
  kind: string;
  createdAt: string;
}

export interface MercuryTransaction {
  id: string;
  amount: number;
  bankDescription: string | null;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyNickname: string | null;
  createdAt: string;
  dashboardLink: string;
  details: {
    address?: {
      address1: string;
      city: string;
      state: string;
      postalCode: string;
    };
    domesticWireRoutingInfo?: {
      bankName: string;
      routingNumber: string;
    };
    electronicRoutingInfo?: {
      bankName: string;
      routingNumber: string;
      accountNumber: string;
    };
  } | null;
  estimatedDeliveryDate: string | null;
  failedAt: string | null;
  feeId: string | null;
  kind: string;
  note: string | null;
  externalMemo: string | null;
  postedAt: string | null;
  reasonForFailure: string | null;
  status: string;
}

export interface MercuryRecipient {
  id: string;
  name: string;
  nickname: string | null;
  status: string;
  emails: string[];
  paymentMethod: string;
  electronicRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountType: string;
  };
  address?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface MercuryServiceConfig {
  apiToken: string;
}

export interface MercuryResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MercuryService {
  private apiToken: string;
  private baseUrl = "https://api.mercury.com/api/v1";

  constructor(config: MercuryServiceConfig) {
    this.apiToken = config.apiToken;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>
  ): Promise<MercuryResponse<T>> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Mercury API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Mercury API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<MercuryResponse<{ accounts: MercuryAccount[] }>> {
    return this.request("GET", "/accounts");
  }

  /**
   * Get a specific account by ID
   */
  async getAccount(accountId: string): Promise<MercuryResponse<MercuryAccount>> {
    return this.request("GET", `/account/${accountId}`);
  }

  /**
   * Get transactions for a specific account
   */
  async getTransactions(
    accountId: string,
    options?: {
      offset?: number;
      limit?: number;
      status?: string;
      start?: string; // ISO date string
      end?: string; // ISO date string
    }
  ): Promise<MercuryResponse<{ total: number; transactions: MercuryTransaction[] }>> {
    const queryParams: Record<string, string> = {};
    
    if (options?.offset !== undefined) queryParams.offset = options.offset.toString();
    if (options?.limit !== undefined) queryParams.limit = options.limit.toString();
    if (options?.status) queryParams.status = options.status;
    if (options?.start) queryParams.start = options.start;
    if (options?.end) queryParams.end = options.end;

    return this.request("GET", `/account/${accountId}/transactions`, undefined, queryParams);
  }

  /**
   * Get a specific transaction
   */
  async getTransaction(
    accountId: string,
    transactionId: string
  ): Promise<MercuryResponse<MercuryTransaction>> {
    return this.request("GET", `/account/${accountId}/transaction/${transactionId}`);
  }

  /**
   * Get all recipients
   */
  async getRecipients(): Promise<MercuryResponse<{ recipients: MercuryRecipient[] }>> {
    return this.request("GET", "/recipients");
  }

  /**
   * Get a specific recipient by ID
   */
  async getRecipient(recipientId: string): Promise<MercuryResponse<MercuryRecipient>> {
    return this.request("GET", `/recipient/${recipientId}`);
  }

  /**
   * Get account statements
   */
  async getStatements(accountId: string): Promise<MercuryResponse<{ statements: Array<{
    id: string;
    month: number;
    year: number;
    url: string;
  }> }>> {
    return this.request("GET", `/account/${accountId}/statements`);
  }
}

/**
 * Create a Mercury service instance from environment variables
 */
export function createMercuryService(): MercuryService | null {
  const apiToken = process.env.MERCURY_API_TOKEN;
  
  if (!apiToken) {
    console.warn("Mercury API token not configured. Set MERCURY_API_TOKEN in your environment variables.");
    return null;
  }

  return new MercuryService({ apiToken });
}
