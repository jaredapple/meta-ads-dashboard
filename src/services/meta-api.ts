import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { MetaInsightResponse, MetaInsight } from '../database/types';

interface RateLimitState {
  callCount: number;
  windowStart: number;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public errorSubcode?: number
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

export interface MetaApiCredentials {
  accountId: string;
  accessToken: string;
}

export class MetaApiClient {
  private client: AxiosInstance;
  private rateLimit: RateLimitState = { callCount: 0, windowStart: Date.now() };
  private readonly MAX_CALLS_PER_HOUR = 200; // Meta's default rate limit
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
  private credentials: MetaApiCredentials | null = null;

  constructor(credentials?: MetaApiCredentials) {
    // Support both new multi-account and legacy single-account modes
    this.credentials = credentials || null;
    
    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v21.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        // Add access token to all requests
        // Use provided credentials or fall back to environment
        const accessToken = this.credentials?.accessToken || env.meta.accessToken;
        config.params = {
          ...config.params,
          access_token: accessToken,
        };

        logger.debug('Meta API request', {
          url: config.url,
          params: config.params,
        });

        return config;
      },
      (error) => {
        logger.error('Meta API request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.updateRateLimit();
        logger.debug('Meta API response success', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.updateRateLimit();
        
        if (error.response) {
          const { status, data } = error.response;
          logger.error('Meta API response error', new Error(`HTTP ${status}`), {
            status,
            error: data.error,
            url: error.config?.url,
          });

          // Handle different types of Meta API errors
          if (data.error) {
            const metaError = data.error;
            throw new MetaApiError(
              metaError.message || 'Meta API Error',
              status,
              metaError.code,
              metaError.error_subcode
            );
          }
        } else if (error.request) {
          logger.error('Meta API network error', error);
          throw new MetaApiError('Network error communicating with Meta API');
        } else {
          logger.error('Meta API unknown error', error);
          throw new MetaApiError('Unknown error occurred');
        }

        return Promise.reject(error);
      }
    );
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimit.windowStart >= this.RATE_LIMIT_WINDOW) {
      this.rateLimit = { callCount: 0, windowStart: now };
    }

    // Check if we've hit the limit
    if (this.rateLimit.callCount >= this.MAX_CALLS_PER_HOUR) {
      const waitTime = this.RATE_LIMIT_WINDOW - (now - this.rateLimit.windowStart);
      logger.warn('Rate limit reached, waiting', { waitTime });
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimit = { callCount: 0, windowStart: Date.now() };
    }
  }

  private updateRateLimit(): void {
    this.rateLimit.callCount++;
  }

  /**
   * Set or update credentials for this client instance
   */
  setCredentials(credentials: MetaApiCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Get the current account ID being used
   */
  getCurrentAccountId(): string {
    return this.credentials?.accountId || env.meta.accountId;
  }

  async getAccountInfo(accountId?: string): Promise<any> {
    try {
      // Use provided accountId or current credentials
      const targetAccountId = accountId || this.getCurrentAccountId();
      
      // Ensure account ID has the correct format
      const formattedAccountId = targetAccountId.startsWith('act_') ? targetAccountId : `act_${targetAccountId}`;
      
      const response = await this.client.get(`/${formattedAccountId}`, {
        params: {
          fields: 'id,name,currency,timezone_name',
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get account info', error as Error, { accountId });
      throw error;
    }
  }

  async getCampaigns(accountId?: string, options: {
    fields?: string[];
    limit?: number;
    after?: string;
  } = {}): Promise<any> {
    try {
      const fields = options.fields || [
        'id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget',
        'start_time', 'stop_time', 'created_time', 'updated_time'
      ];

      // Use provided accountId or current credentials
      const targetAccountId = accountId || this.getCurrentAccountId();
      
      // Ensure account ID has the correct format
      const formattedAccountId = targetAccountId.startsWith('act_') ? targetAccountId : `act_${targetAccountId}`;

      const response = await this.client.get(`/${formattedAccountId}/campaigns`, {
        params: {
          fields: fields.join(','),
          limit: options.limit || 1000,
          after: options.after,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get campaigns', error as Error, { accountId });
      throw error;
    }
  }

  async getAdSets(campaignId: string, options: {
    fields?: string[];
    limit?: number;
    after?: string;
  } = {}): Promise<any> {
    try {
      const fields = options.fields || [
        'id', 'name', 'status', 'daily_budget', 'lifetime_budget', 'bid_amount',
        'optimization_goal', 'billing_event', 'start_time', 'end_time',
        'created_time', 'updated_time', 'campaign_id'
      ];

      const response = await this.client.get(`/${campaignId}/adsets`, {
        params: {
          fields: fields.join(','),
          limit: options.limit || 1000,
          after: options.after,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get ad sets', error as Error, { campaignId });
      throw error;
    }
  }

  async getAds(adSetId: string, options: {
    fields?: string[];
    limit?: number;
    after?: string;
  } = {}): Promise<any> {
    try {
      const fields = options.fields || [
        'id', 'name', 'status', 'creative', 'created_time', 'updated_time',
        'adset_id', 'campaign_id'
      ];

      const response = await this.client.get(`/${adSetId}/ads`, {
        params: {
          fields: fields.join(','),
          limit: options.limit || 1000,
          after: options.after,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get ads', error as Error, { adSetId });
      throw error;
    }
  }

  async getAdInsights(adId: string, options: {
    dateStart: string;
    dateEnd: string;
    fields?: string[];
    level?: 'ad' | 'adset' | 'campaign' | 'account';
    timeIncrement?: number;
  }): Promise<MetaInsightResponse> {
    try {
      const fields = options.fields || [
        'date_start', 'date_stop', 'account_id', 'campaign_id', 'adset_id', 'ad_id',
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'actions', 'action_values', 'cost_per_action_type',
        // Comprehensive video metrics to ensure complete data collection
        'video_play_actions', 'video_thruplay_watched_actions',
        'video_15_sec_watched_actions', 'video_30_sec_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p95_watched_actions',
        'video_p100_watched_actions', 'video_avg_time_watched_actions',
        // Additional video metrics for better coverage
        'video_play_curve_actions', 'video_time_watched_actions'
      ];

      const response = await this.client.get(`/${adId}/insights`, {
        params: {
          fields: fields.join(','),
          time_range: JSON.stringify({
            since: options.dateStart,
            until: options.dateEnd,
          }),
          level: options.level || 'ad',
          time_increment: options.timeIncrement || 1, // Daily
          // Attribution parameters to match Ads Manager behavior
          use_unified_attribution_setting: true,
          use_account_attribution_setting: true,
          action_attribution_windows: JSON.stringify(['7d_click', '1d_view']),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get ad insights', error as Error, { adId, options });
      throw error;
    }
  }

  async getAccountInsights(accountId?: string, options: {
    dateStart: string;
    dateEnd: string;
    fields?: string[];
    level?: 'ad' | 'adset' | 'campaign' | 'account';
    timeIncrement?: number;
    limit?: number;
    after?: string;
  }): Promise<MetaInsightResponse> {
    try {
      const fields = options.fields || [
        'date_start', 'date_stop', 'account_id', 'campaign_id', 'adset_id', 'ad_id',
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'actions', 'action_values', 'cost_per_action_type',
        // Comprehensive video metrics to ensure complete data collection
        'video_play_actions', 'video_thruplay_watched_actions',
        'video_15_sec_watched_actions', 'video_30_sec_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p95_watched_actions',
        'video_p100_watched_actions', 'video_avg_time_watched_actions',
        // Additional video metrics for better coverage
        'video_play_curve_actions', 'video_time_watched_actions'
      ];

      // Use provided accountId or current credentials
      const targetAccountId = accountId || this.getCurrentAccountId();
      
      // Ensure account ID has the correct format
      const formattedAccountId = targetAccountId.startsWith('act_') ? targetAccountId : `act_${targetAccountId}`;

      const response = await this.client.get(`/${formattedAccountId}/insights`, {
        params: {
          fields: fields.join(','),
          time_range: JSON.stringify({
            since: options.dateStart,
            until: options.dateEnd,
          }),
          level: options.level || 'ad',
          time_increment: options.timeIncrement || 1, // Daily
          limit: options.limit || 1000,
          after: options.after,
          // Attribution parameters to match Ads Manager behavior
          use_unified_attribution_setting: true,
          use_account_attribution_setting: true,
          action_attribution_windows: JSON.stringify(['7d_click', '1d_view']),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get account insights', error as Error, { accountId, options });
      throw error;
    }
  }

  async getAllInsights(accountId?: string, options: {
    dateStart: string;
    dateEnd: string;
    level?: 'ad' | 'adset' | 'campaign' | 'account';
  }): Promise<MetaInsight[]> {
    const allInsights: MetaInsight[] = [];
    let after: string | undefined;
    
    try {
      do {
        const response = await this.getAccountInsights(accountId, {
          ...options,
          after,
        });

        if (response.data && response.data.length > 0) {
          allInsights.push(...response.data);
        }

        after = response.paging?.cursors?.after;
      } while (after);

      logger.info('Retrieved all insights', {
        accountId,
        count: allInsights.length,
        dateStart: options.dateStart,
        dateEnd: options.dateEnd,
      });

      return allInsights;
    } catch (error) {
      logger.error('Failed to get all insights', error as Error, { accountId, options });
      throw error;
    }
  }
}