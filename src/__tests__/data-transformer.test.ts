import { DataTransformer, TransformedInsight } from '../services/data-transformer';
import { MetaInsight } from '../database/types';

describe('DataTransformer', () => {
  describe('transformMetaInsight', () => {
    const mockMetaInsight: MetaInsight = {
      date_start: '2025-01-15',
      date_stop: '2025-01-15',
      account_id: '123456789',
      campaign_id: 'campaign_001',
      adset_id: 'adset_001',
      ad_id: 'ad_001',
      impressions: '1000',
      clicks: '50',
      spend: '100.00',
      reach: '800',
      frequency: '1.25',
      actions: [
        { action_type: 'purchase', value: '5' },
        { action_type: 'link_click', value: '45' },
        { action_type: 'video_view', value: '100' },
      ],
      action_values: [
        { action_type: 'purchase', value: '250.00' },
      ],
      cost_per_action_type: [
        { action_type: 'purchase', value: '20.00' },
      ],
      video_p25_watched_actions: [
        { action_type: 'video_view', value: '80' },
      ],
      video_p50_watched_actions: [
        { action_type: 'video_view', value: '60' },
      ],
      video_p75_watched_actions: [
        { action_type: 'video_view', value: '40' },
      ],
      video_p100_watched_actions: [
        { action_type: 'video_view', value: '25' },
      ],
    };

    it('should transform basic numeric fields correctly', () => {
      const result = DataTransformer.transformMetaInsight(mockMetaInsight);
      
      expect(result.impressions).toBe(1000);
      expect(result.clicks).toBe(50);
      expect(result.spend).toBe(100.00);
      expect(result.reach).toBe(800);
      expect(result.frequency).toBe(1.25);
    });

    it('should transform string fields correctly', () => {
      const result = DataTransformer.transformMetaInsight(mockMetaInsight);
      
      expect(result.date_start).toBe('2025-01-15');
      expect(result.account_id).toBe('123456789');
      expect(result.campaign_id).toBe('campaign_001');
      expect(result.ad_set_id).toBe('adset_001');
      expect(result.ad_id).toBe('ad_001');
    });

    it('should extract conversion metrics correctly', () => {
      const result = DataTransformer.transformMetaInsight(mockMetaInsight);
      
      expect(result.conversions).toBe(5);
      expect(result.conversion_values).toBe(250.00);
      expect(result.cost_per_conversion).toBe(20.00);
    });

    it('should extract engagement metrics correctly', () => {
      const result = DataTransformer.transformMetaInsight(mockMetaInsight);
      
      expect(result.link_clicks).toBe(45);
      expect(result.video_views).toBe(100);
      expect(result.video_p25_watched_actions).toBe(80);
      expect(result.video_p50_watched_actions).toBe(60);
      expect(result.video_p75_watched_actions).toBe(40);
      expect(result.video_p100_watched_actions).toBe(25);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalInsight: MetaInsight = {
        date_start: '2025-01-15',
        date_stop: '2025-01-15',
        account_id: '123456789',
        campaign_id: 'campaign_001',
        adset_id: 'adset_001',
        ad_id: 'ad_001',
        impressions: '500',
        clicks: '25',
        spend: '50.00',
      };

      const result = DataTransformer.transformMetaInsight(minimalInsight);
      
      expect(result.impressions).toBe(500);
      expect(result.clicks).toBe(25);
      expect(result.spend).toBe(50.00);
      expect(result.reach).toBe(0);
      expect(result.conversions).toBeUndefined();
      expect(result.video_views).toBeUndefined();
    });

    it('should handle zero values correctly', () => {
      const zeroInsight: MetaInsight = {
        ...mockMetaInsight,
        impressions: '0',
        clicks: '0',
        spend: '0.00',
        actions: [],
        action_values: [],
      };

      const result = DataTransformer.transformMetaInsight(zeroInsight);
      
      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.spend).toBe(0);
      expect(result.conversions).toBeUndefined();
      expect(result.conversion_values).toBeUndefined();
    });

    it('should handle invalid numeric strings gracefully', () => {
      const invalidInsight: MetaInsight = {
        ...mockMetaInsight,
        impressions: 'invalid',
        clicks: '',
        spend: 'not-a-number',
      };

      const result = DataTransformer.transformMetaInsight(invalidInsight);
      
      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.spend).toBe(0);
    });
  });

  describe('validateInsight', () => {
    const validInsight: TransformedInsight = {
      date_start: '2025-01-15',
      account_id: '123456789',
      campaign_id: 'campaign_001',
      ad_set_id: 'adset_001',
      ad_id: 'ad_001',
      impressions: 1000,
      clicks: 50,
      spend: 100.00,
    };

    it('should validate correct insight', () => {
      const result = DataTransformer.validateInsight(validInsight);
      expect(result).toBe(true);
    });

    it('should reject insight with missing required fields', () => {
      const invalidInsight = { ...validInsight };
      delete (invalidInsight as any).ad_id;
      
      const result = DataTransformer.validateInsight(invalidInsight);
      expect(result).toBe(false);
    });

    it('should reject insight with negative values', () => {
      const invalidInsight = { ...validInsight, spend: -100 };
      
      const result = DataTransformer.validateInsight(invalidInsight);
      expect(result).toBe(false);
    });

    it('should reject insight with invalid date format', () => {
      const invalidInsight = { ...validInsight, date_start: '2025/01/15' };
      
      const result = DataTransformer.validateInsight(invalidInsight);
      expect(result).toBe(false);
    });

    it('should accept insight with zero values', () => {
      const zeroInsight = { ...validInsight, spend: 0, clicks: 0 };
      
      const result = DataTransformer.validateInsight(zeroInsight);
      expect(result).toBe(true);
    });
  });

  describe('transformBatchInsights', () => {
    const mockInsights: MetaInsight[] = [
      {
        date_start: '2025-01-15',
        date_stop: '2025-01-15',
        account_id: '123456789',
        campaign_id: 'campaign_001',
        adset_id: 'adset_001',
        ad_id: 'ad_001',
        impressions: '1000',
        clicks: '50',
        spend: '100.00',
      },
      {
        date_start: '2025-01-14',
        date_stop: '2025-01-14',
        account_id: '123456789',
        campaign_id: 'campaign_001',
        adset_id: 'adset_001',
        ad_id: 'ad_002',
        impressions: '800',
        clicks: '40',
        spend: '80.00',
      },
    ];

    it('should transform multiple insights successfully', () => {
      const result = DataTransformer.transformBatchInsights(mockInsights);
      
      expect(result).toHaveLength(2);
      expect(result[0].ad_id).toBe('ad_001');
      expect(result[1].ad_id).toBe('ad_002');
    });

    it('should handle empty array', () => {
      const result = DataTransformer.transformBatchInsights([]);
      expect(result).toHaveLength(0);
    });

    it('should continue processing even if some insights fail', () => {
      const mixedInsights = [
        mockInsights[0],
        {
          ...mockInsights[1],
          date_start: '', // This will cause validation to fail
        } as MetaInsight,
      ];

      // Should not throw, but may have fewer results
      const result = DataTransformer.transformBatchInsights(mixedInsights);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('filterValidInsights', () => {
    const validInsight: TransformedInsight = {
      date_start: '2025-01-15',
      account_id: '123456789',
      campaign_id: 'campaign_001',
      ad_set_id: 'adset_001',
      ad_id: 'ad_001',
      impressions: 1000,
      clicks: 50,
      spend: 100.00,
    };

    const invalidInsight: TransformedInsight = {
      ...validInsight,
      ad_id: '', // Missing required field
    };

    it('should filter out invalid insights', () => {
      const insights = [validInsight, invalidInsight];
      const result = DataTransformer.filterValidInsights(insights);
      
      expect(result).toHaveLength(1);
      expect(result[0].ad_id).toBe('ad_001');
    });

    it('should return all insights if all are valid', () => {
      const insights = [validInsight, { ...validInsight, ad_id: 'ad_002' }];
      const result = DataTransformer.filterValidInsights(insights);
      
      expect(result).toHaveLength(2);
    });

    it('should return empty array if all insights are invalid', () => {
      const insights = [invalidInsight, { ...invalidInsight, ad_id: '' }];
      const result = DataTransformer.filterValidInsights(insights);
      
      expect(result).toHaveLength(0);
    });
  });
});