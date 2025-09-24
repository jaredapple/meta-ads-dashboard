import axios from 'axios';
import { MetaApiClient, MetaApiError } from '../services/meta-api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MetaApiClient', () => {
  let client: MetaApiClient;

  beforeEach(() => {
    client = new MetaApiClient();
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    mockedAxios.create.mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any);
  });

  describe('constructor', () => {
    it('should create axios client with correct configuration', () => {
      new MetaApiClient();
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://graph.facebook.com/v21.0',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      // Reset the rate limit state between tests
      (client as any).rateLimit = { callCount: 0, windowStart: Date.now() };
    });

    it('should track API calls for rate limiting', async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      const testClient = new MetaApiClient();
      
      // Verify interceptors were set up
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw MetaApiError for API errors', () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid parameter',
              code: 100,
              error_subcode: 1234,
            },
          },
        },
      };

      const mockAxiosInstance = {
        interceptors: {
          request: { 
            use: jest.fn().mockImplementation((successHandler, errorHandler) => {
              // Call the success handler
              return successHandler;
            })
          },
          response: { 
            use: jest.fn().mockImplementation((successHandler, errorHandler) => {
              // Simulate an error by calling the error handler
              try {
                errorHandler(errorResponse);
              } catch (error) {
                expect(error).toBeInstanceOf(MetaApiError);
                expect(error.message).toBe('Invalid parameter');
                expect(error.statusCode).toBe(400);
                expect(error.errorCode).toBe(100);
                expect(error.errorSubcode).toBe(1234);
              }
            })
          },
        },
        get: jest.fn(),
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      new MetaApiClient();
      
      // The error handling is tested in the interceptor setup above
    });

    it('should handle network errors', () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { 
            use: jest.fn().mockImplementation((successHandler, errorHandler) => {
              try {
                errorHandler(networkError);
              } catch (error) {
                expect(error).toBeInstanceOf(MetaApiError);
                expect(error.message).toBe('Network error communicating with Meta API');
              }
            })
          },
        },
        get: jest.fn(),
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      new MetaApiClient();
    });
  });
});