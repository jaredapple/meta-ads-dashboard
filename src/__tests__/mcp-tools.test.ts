import { MCPTools } from '../mcp/tools';
import { DataService } from '../services/data-service';
import { DateParser } from '../utils/date-parser';

// Mock dependencies
jest.mock('../services/data-service');
jest.mock('../utils/date-parser');

const MockedDataService = DataService as jest.MockedClass<typeof DataService>;
const MockedDateParser = DateParser as jest.MockedClass<typeof DateParser>;

describe('MCPTools', () => {
  let mcpTools: MCPTools;
  let mockDataService: jest.Mocked<DataService>;

  beforeEach(() => {
    mockDataService = {
      getSpendData: jest.fn(),
      getRoasData: jest.fn(),
      getBestAds: jest.fn(),
      getCampaignPerformance: jest.fn(),
    } as any;

    MockedDataService.mockImplementation(() => mockDataService);
    mcpTools = new MCPTools();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const tools = mcpTools.getToolDefinitions();
      
      expect(tools).toHaveLength(4);
      
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('get_spend');
      expect(toolNames).toContain('get_roas');
      expect(toolNames).toContain('best_ad');
      expect(toolNames).toContain('campaign_performance');
    });

    it('should have required properties for each tool', () => {
      const tools = mcpTools.getToolDefinitions();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
      });
    });
  });

  describe('executeGetSpend', () => {
    const mockSpendData = [
      {
        date_start: '2025-01-01',
        account_id: '123',
        campaign_id: 'camp1',
        ad_set_id: 'adset1',
        spend: 100,
        impressions: 1000,
        clicks: 50,
      },
      {
        date_start: '2025-01-01',
        account_id: '123',
        campaign_id: 'camp1',
        ad_set_id: 'adset1',
        spend: 50,
        impressions: 500,
        clicks: 25,
      },
    ];

    beforeEach(() => {
      MockedDateParser.parseDateRange.mockReturnValue({
        startDate: '2025-01-01',
        endDate: '2025-01-01',
      });
      MockedDateParser.validateDateRange.mockImplementation(() => {});
      MockedDateParser.formatDateRangeForDisplay.mockReturnValue('2025-01-01');
      MockedDateParser.getRelativeDescription.mockReturnValue('today');
      
      mockDataService.getSpendData.mockResolvedValue(mockSpendData);
    });

    it('should execute get_spend successfully', async () => {
      const args = { date_range: 'today' };
      const result = await mcpTools.executeGetSpend(args);

      expect(MockedDateParser.parseDateRange).toHaveBeenCalledWith('today');
      expect(mockDataService.getSpendData).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-01',
        accountId: undefined,
        campaignId: undefined,
        adSetId: undefined,
      });

      expect(result).toHaveProperty('date_range', '2025-01-01');
      expect(result).toHaveProperty('summary');
      expect(result.summary.total_spend).toBe(150);
      expect(result.summary.total_impressions).toBe(1500);
      expect(result.summary.total_clicks).toBe(75);
    });

    it('should handle filters correctly', async () => {
      const args = {
        date_range: 'last_7d',
        account_id: '123',
        campaign_id: 'camp1',
      };

      await mcpTools.executeGetSpend(args);

      expect(mockDataService.getSpendData).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-01',
        accountId: '123',
        campaignId: 'camp1',
        adSetId: undefined,
      });
    });

    it('should handle empty results', async () => {
      mockDataService.getSpendData.mockResolvedValue([]);

      const args = { date_range: 'today' };
      const result = await mcpTools.executeGetSpend(args);

      expect(result.summary.total_spend).toBe(0);
      expect(result.daily_breakdown).toHaveLength(0);
    });

    it('should handle date parser errors', async () => {
      const dateError = new (class extends Error {
        input = 'invalid-date';
        constructor() {
          super('Invalid date');
          this.name = 'DateParserError';
        }
      })();

      MockedDateParser.parseDateRange.mockImplementation(() => {
        throw dateError;
      });

      const args = { date_range: 'invalid-date' };
      const result = await mcpTools.executeGetSpend(args);

      expect(result).toHaveProperty('error', 'Invalid date range');
      expect(result).toHaveProperty('message', 'Invalid date');
    });
  });

  describe('executeGetRoas', () => {
    const mockRoasData = [
      {
        date_start: '2025-01-01',
        account_id: '123',
        campaign_id: 'camp1',
        spend: 100,
        conversion_values: 200,
        roas: 2.0,
      },
    ];

    beforeEach(() => {
      MockedDateParser.parseDateRange.mockReturnValue({
        startDate: '2025-01-01',
        endDate: '2025-01-01',
      });
      MockedDateParser.validateDateRange.mockImplementation(() => {});
      MockedDateParser.formatDateRangeForDisplay.mockReturnValue('2025-01-01');
      MockedDateParser.getRelativeDescription.mockReturnValue('today');
      
      mockDataService.getRoasData.mockResolvedValue(mockRoasData);
    });

    it('should execute get_roas successfully', async () => {
      const args = { date_range: 'today' };
      const result = await mcpTools.executeGetRoas(args);

      expect(mockDataService.getRoasData).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-01',
        accountId: undefined,
        campaignId: undefined,
        adSetId: undefined,
      });

      expect(result.summary.total_spend).toBe(100);
      expect(result.summary.total_conversion_value).toBe(200);
      expect(result.summary.average_roas).toBe(2);
    });

    it('should handle no conversion data', async () => {
      mockDataService.getRoasData.mockResolvedValue([]);

      const args = { date_range: 'today' };
      const result = await mcpTools.executeGetRoas(args);

      expect(result.message).toContain('No conversion data found');
      expect(result.summary.average_roas).toBe(0);
    });
  });

  describe('executeBestAd', () => {
    const mockBestAds = [
      {
        ad_id: 'ad1',
        ad_name: 'Best Ad',
        campaign_name: 'Best Campaign',
        total_spend: 100,
        total_conversions: 5,
        avg_roas: 2.5,
        avg_ctr: 3.2,
        avg_cpc: 2.0,
        metric_value: 100,
      },
    ];

    beforeEach(() => {
      MockedDateParser.parseDateRange.mockReturnValue({
        startDate: '2025-01-01',
        endDate: '2025-01-01',
      });
      MockedDateParser.validateDateRange.mockImplementation(() => {});
      MockedDateParser.formatDateRangeForDisplay.mockReturnValue('2025-01-01');
      MockedDateParser.getRelativeDescription.mockReturnValue('today');
      
      mockDataService.getBestAds.mockResolvedValue(mockBestAds);
    });

    it('should execute best_ad successfully', async () => {
      const args = {
        metric: 'spend',
        date_range: 'today',
        limit: 10,
      };

      const result = await mcpTools.executeBestAd(args);

      expect(mockDataService.getBestAds).toHaveBeenCalledWith({
        metric: 'spend',
        dateStart: '2025-01-01',
        dateEnd: '2025-01-01',
        accountId: undefined,
        campaignId: undefined,
        limit: 10,
      });

      expect(result.ads).toHaveLength(1);
      expect(result.ads[0]).toHaveProperty('rank', 1);
      expect(result.ads[0]).toHaveProperty('ad_id', 'ad1');
      expect(result.ads[0].metrics.total_spend).toBe(100);
    });

    it('should enforce limit constraints', async () => {
      const args = {
        metric: 'spend',
        date_range: 'today',
        limit: 100, // Should be capped at 50
      };

      await mcpTools.executeBestAd(args);

      expect(mockDataService.getBestAds).toHaveBeenCalledWith({
        metric: 'spend',
        dateStart: '2025-01-01',
        dateEnd: '2025-01-01',
        accountId: undefined,
        campaignId: undefined,
        limit: 50, // Capped at maximum
      });
    });

    it('should handle no ads found', async () => {
      mockDataService.getBestAds.mockResolvedValue([]);

      const args = {
        metric: 'spend',
        date_range: 'today',
      };

      const result = await mcpTools.executeBestAd(args);

      expect(result.message).toContain('No ad data found');
      expect(result.ads).toHaveLength(0);
    });

    it('should validate metric parameter', async () => {
      const args = {
        metric: 'spend',
        date_range: 'today',
      };

      const result = await mcpTools.executeBestAd(args);

      expect(result.metric).toBe('spend');
      expect(result.metric_description).toBe('Total advertising spend');
    });
  });

  describe('executeCampaignPerformance', () => {
    const mockCampaignData = [
      {
        campaign_id: 'camp1',
        campaign_name: 'Test Campaign',
        campaign_objective: 'OUTCOME_SALES',
        campaign_status: 'ACTIVE',
        total_spend: 500,
        total_impressions: 10000,
        total_clicks: 250,
        total_conversions: 5,
        total_conversion_value: 1000,
        avg_ctr: 2.5,
        avg_cpc: 2.0,
        avg_roas: 2.0,
        budget_utilization: 75.5,
        daily_budget: 100,
        lifetime_budget: 0,
        active_ads: 3,
      },
    ];

    beforeEach(() => {
      MockedDateParser.parseDateRange.mockReturnValue({
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      });
      MockedDateParser.validateDateRange.mockImplementation(() => {});
      MockedDateParser.formatDateRangeForDisplay.mockReturnValue('2025-01-01 to 2025-01-07');
      MockedDateParser.getRelativeDescription.mockReturnValue('last 7 days');
      
      mockDataService.getCampaignPerformance.mockResolvedValue(mockCampaignData);
    });

    it('should execute campaign_performance successfully', async () => {
      const args = { date_range: 'last_7d' };
      const result = await mcpTools.executeCampaignPerformance(args);

      expect(mockDataService.getCampaignPerformance).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-07',
        accountId: undefined,
        limit: 50,
      });

      expect(result).toHaveProperty('date_range', '2025-01-01 to 2025-01-07');
      expect(result.summary.total_campaigns).toBe(1);
      expect(result.summary.total_spend).toBe(500);
      expect(result.summary.active_campaigns).toBe(1);
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]).toHaveProperty('rank', 1);
      expect(result.campaigns[0]).toHaveProperty('campaign_name', 'Test Campaign');
    });

    it('should handle filters correctly', async () => {
      const args = {
        date_range: 'last_30d',
        account_id: '123',
        limit: 25,
      };

      await mcpTools.executeCampaignPerformance(args);

      expect(mockDataService.getCampaignPerformance).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-07',
        accountId: '123',
        limit: 25,
      });
    });

    it('should enforce limit constraints', async () => {
      const args = {
        date_range: 'today',
        limit: 150, // Should be capped at 100
      };

      await mcpTools.executeCampaignPerformance(args);

      expect(mockDataService.getCampaignPerformance).toHaveBeenCalledWith({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-07',
        accountId: undefined,
        limit: 100, // Capped at maximum
      });
    });

    it('should handle no campaigns found', async () => {
      mockDataService.getCampaignPerformance.mockResolvedValue([]);

      const args = { date_range: 'today' };
      const result = await mcpTools.executeCampaignPerformance(args);

      expect(result.message).toContain('No campaign data found');
      expect(result.campaigns).toHaveLength(0);
      expect(result.summary.total_campaigns).toBe(0);
    });

    it('should calculate summary metrics correctly', async () => {
      const multiCampaignData = [
        ...mockCampaignData,
        {
          ...mockCampaignData[0],
          campaign_id: 'camp2',
          campaign_name: 'Test Campaign 2',
          campaign_status: 'PAUSED',
          total_spend: 300,
          total_conversions: 3,
          total_conversion_value: 600,
        },
      ];

      mockDataService.getCampaignPerformance.mockResolvedValue(multiCampaignData);

      const args = { date_range: 'last_7d' };
      const result = await mcpTools.executeCampaignPerformance(args);

      expect(result.summary.total_campaigns).toBe(2);
      expect(result.summary.total_spend).toBe(800); // 500 + 300
      expect(result.summary.total_conversions).toBe(8); // 5 + 3
      expect(result.summary.total_conversion_value).toBe(1600); // 1000 + 600
      expect(result.summary.average_roas).toBe(2); // 1600 / 800
      expect(result.summary.active_campaigns).toBe(1); // Only one ACTIVE
    });
  });
});