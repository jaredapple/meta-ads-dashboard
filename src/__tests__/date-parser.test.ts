import { DateParser, DateParserError } from '../utils/date-parser';

describe('DateParser', () => {
  describe('parseDateRange', () => {
    beforeAll(() => {
      // Mock current date to make tests deterministic
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    describe('preset ranges', () => {
      it('should parse "today" correctly', () => {
        const result = DateParser.parseDateRange('today');
        expect(result).toEqual({
          startDate: '2025-01-15',
          endDate: '2025-01-15',
        });
      });

      it('should parse "yesterday" correctly', () => {
        const result = DateParser.parseDateRange('yesterday');
        expect(result).toEqual({
          startDate: '2025-01-14',
          endDate: '2025-01-14',
        });
      });

      it('should parse "last_7d" correctly', () => {
        const result = DateParser.parseDateRange('last_7d');
        expect(result).toEqual({
          startDate: '2025-01-08',
          endDate: '2025-01-14',
        });
      });

      it('should parse "last_30d" correctly', () => {
        const result = DateParser.parseDateRange('last_30d');
        expect(result).toEqual({
          startDate: '2024-12-16',
          endDate: '2025-01-14',
        });
      });

      it('should handle case insensitive preset ranges', () => {
        const result = DateParser.parseDateRange('LAST_7D');
        expect(result.startDate).toBe('2025-01-08');
        expect(result.endDate).toBe('2025-01-14');
      });

      it('should handle alternative preset formats', () => {
        const result1 = DateParser.parseDateRange('last_7_days');
        const result2 = DateParser.parseDateRange('last_7d');
        expect(result1).toEqual(result2);
      });
    });

    describe('custom ranges', () => {
      it('should parse comma-separated date range', () => {
        const result = DateParser.parseDateRange('2025-01-01,2025-01-31');
        expect(result).toEqual({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });
      });

      it('should parse "to" separated date range', () => {
        const result = DateParser.parseDateRange('2025-01-01 to 2025-01-31');
        expect(result).toEqual({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });
      });

      it('should handle whitespace in custom ranges', () => {
        const result = DateParser.parseDateRange('  2025-01-01  ,  2025-01-31  ');
        expect(result).toEqual({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });
      });

      it('should throw error if start date is after end date', () => {
        expect(() => {
          DateParser.parseDateRange('2025-01-31,2025-01-01');
        }).toThrow(DateParserError);
      });
    });

    describe('single dates', () => {
      it('should parse single date as same start and end', () => {
        const result = DateParser.parseDateRange('2025-01-15');
        expect(result).toEqual({
          startDate: '2025-01-15',
          endDate: '2025-01-15',
        });
      });
    });

    describe('error cases', () => {
      it('should throw error for invalid date format', () => {
        expect(() => {
          DateParser.parseDateRange('2025/01/01');
        }).toThrow(DateParserError);
      });

      it('should throw error for invalid date', () => {
        expect(() => {
          DateParser.parseDateRange('2025-13-01');
        }).toThrow(DateParserError);
      });

      it('should throw error for unknown preset', () => {
        expect(() => {
          DateParser.parseDateRange('last_100_days');
        }).toThrow(DateParserError);
      });

      it('should throw error for empty input', () => {
        expect(() => {
          DateParser.parseDateRange('');
        }).toThrow(DateParserError);
      });
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date range', () => {
      expect(() => {
        DateParser.validateDateRange({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });
      }).not.toThrow();
    });

    it('should throw error for invalid start date', () => {
      expect(() => {
        DateParser.validateDateRange({
          startDate: '2025-13-01',
          endDate: '2025-01-31',
        });
      }).toThrow(DateParserError);
    });

    it('should throw error for start date after end date', () => {
      expect(() => {
        DateParser.validateDateRange({
          startDate: '2025-01-31',
          endDate: '2025-01-01',
        });
      }).toThrow(DateParserError);
    });

    it('should throw error for date range too large', () => {
      expect(() => {
        DateParser.validateDateRange({
          startDate: '2024-01-01',
          endDate: '2025-12-31',
        });
      }).toThrow(DateParserError);
    });
  });

  describe('formatDateRangeForDisplay', () => {
    it('should format single date correctly', () => {
      const result = DateParser.formatDateRangeForDisplay({
        startDate: '2025-01-15',
        endDate: '2025-01-15',
      });
      expect(result).toBe('2025-01-15');
    });

    it('should format date range correctly', () => {
      const result = DateParser.formatDateRangeForDisplay({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(result).toBe('2025-01-01 to 2025-01-31');
    });
  });

  describe('getRelativeDescription', () => {
    beforeAll(() => {
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    });

    it('should describe today correctly', () => {
      const result = DateParser.getRelativeDescription({
        startDate: '2025-01-15',
        endDate: '2025-01-15',
      });
      expect(result).toBe('today');
    });

    it('should describe yesterday correctly', () => {
      const result = DateParser.getRelativeDescription({
        startDate: '2025-01-14',
        endDate: '2025-01-14',
      });
      expect(result).toBe('yesterday');
    });

    it('should describe last 7 days correctly', () => {
      const result = DateParser.getRelativeDescription({
        startDate: '2025-01-08',
        endDate: '2025-01-14',
      });
      expect(result).toBe('last 7 days');
    });

    it('should fall back to date range for other periods', () => {
      const result = DateParser.getRelativeDescription({
        startDate: '2025-01-01',
        endDate: '2025-01-10',
      });
      expect(result).toBe('2025-01-01 to 2025-01-10');
    });
  });
});