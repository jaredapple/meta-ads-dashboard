import { env } from '../config/env';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export class DateParserError extends Error {
  constructor(message: string, public input?: string) {
    super(message);
    this.name = 'DateParserError';
  }
}

export class DateParser {
  private static timezone = env.app.defaultTimezone;

  static parseDateRange(input: string): DateRange {
    const trimmedInput = input.trim().toLowerCase();

    // Handle preset date ranges
    if (this.isPresetRange(trimmedInput)) {
      return this.parsePresetRange(trimmedInput);
    }

    // Handle custom date ranges
    if (this.isCustomRange(input)) {
      return this.parseCustomRange(input);
    }

    // Handle single date
    if (this.isValidDate(input)) {
      const date = this.formatDate(input);
      return { startDate: date, endDate: date };
    }

    throw new DateParserError(`Invalid date range format: ${input}`, input);
  }

  private static isPresetRange(input: string): boolean {
    const presets = [
      'today', 'yesterday', 'last_7d', 'last_7_days',
      'last_14d', 'last_14_days', 'last_30d', 'last_30_days',
      'this_week', 'last_week', 'this_month', 'last_month',
      'this_quarter', 'last_quarter', 'this_year', 'last_year'
    ];
    return presets.includes(input);
  }

  private static parsePresetRange(preset: string): DateRange {
    const now = new Date();
    const today = this.getDateString(now);
    const yesterday = this.getDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    switch (preset) {
      case 'today':
        return { startDate: today, endDate: today };
      
      case 'yesterday':
        return { startDate: yesterday, endDate: yesterday };
      
      case 'last_7d':
      case 'last_7_days':
        return {
          startDate: this.getDateString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
          endDate: yesterday,
        };
      
      case 'last_14d':
      case 'last_14_days':
        return {
          startDate: this.getDateString(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)),
          endDate: yesterday,
        };
      
      case 'last_30d':
      case 'last_30_days':
        return {
          startDate: this.getDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
          endDate: yesterday,
        };
      
      case 'this_week':
        const thisWeekStart = this.getWeekStart(now);
        // Use yesterday as end date to avoid incomplete current day data
        return {
          startDate: this.getDateString(thisWeekStart),
          endDate: yesterday,
        };
      
      case 'last_week':
        const lastWeekStart = this.getWeekStart(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        const lastWeekEnd = new Date(lastWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        return {
          startDate: this.getDateString(lastWeekStart),
          endDate: this.getDateString(lastWeekEnd),
        };
      
      case 'this_month':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Use yesterday as end date to avoid incomplete current day data
        return {
          startDate: this.getDateString(thisMonthStart),
          endDate: yesterday,
        };
      
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: this.getDateString(lastMonthStart),
          endDate: this.getDateString(lastMonthEnd),
        };
      
      case 'this_quarter':
        const quarterStart = this.getQuarterStart(now);
        // Use yesterday as end date to avoid incomplete current day data
        return {
          startDate: this.getDateString(quarterStart),
          endDate: yesterday,
        };
      
      case 'last_quarter':
        const lastQuarterStart = this.getQuarterStart(new Date(now.getFullYear(), now.getMonth() - 3, 1));
        const lastQuarterEnd = new Date(lastQuarterStart.getFullYear(), lastQuarterStart.getMonth() + 3, 0);
        return {
          startDate: this.getDateString(lastQuarterStart),
          endDate: this.getDateString(lastQuarterEnd),
        };
      
      case 'this_year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        // Use yesterday as end date to avoid incomplete current day data
        return {
          startDate: this.getDateString(yearStart),
          endDate: yesterday,
        };
      
      case 'last_year':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return {
          startDate: this.getDateString(lastYearStart),
          endDate: this.getDateString(lastYearEnd),
        };
      
      default:
        throw new DateParserError(`Unknown preset range: ${preset}`, preset);
    }
  }

  private static isCustomRange(input: string): boolean {
    // Check for date,date format or date to date format
    return /^\d{4}-\d{2}-\d{2}[,\s]+\d{4}-\d{2}-\d{2}$/.test(input) ||
           /^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/.test(input);
  }

  private static parseCustomRange(input: string): DateRange {
    let startStr: string;
    let endStr: string;

    if (input.includes(',')) {
      [startStr, endStr] = input.split(',').map(s => s.trim());
    } else if (input.includes(' to ')) {
      [startStr, endStr] = input.split(' to ').map(s => s.trim());
    } else {
      throw new DateParserError(`Invalid custom date range format: ${input}`, input);
    }

    if (!this.isValidDate(startStr) || !this.isValidDate(endStr)) {
      throw new DateParserError(`Invalid dates in custom range: ${input}`, input);
    }

    const startDate = this.formatDate(startStr);
    const endDate = this.formatDate(endStr);

    // Validate start date is before or equal to end date
    if (startDate > endDate) {
      throw new DateParserError(`Start date must be before end date: ${input}`, input);
    }

    return { startDate, endDate };
  }

  private static isValidDate(dateString: string): boolean {
    // Check YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return false;
    }

    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime()) && dateString === this.getDateString(date);
  }

  private static formatDate(dateString: string): string {
    if (!this.isValidDate(dateString)) {
      throw new DateParserError(`Invalid date format: ${dateString}`, dateString);
    }
    return dateString;
  }

  private static getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day; // Sunday is 0
    return new Date(date.setDate(diff));
  }

  private static getQuarterStart(date: Date): Date {
    const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
    return new Date(date.getFullYear(), quarterMonth, 1);
  }

  // Validation helpers
  static validateDateRange(dateRange: DateRange): void {
    const { startDate, endDate } = dateRange;
    
    if (!this.isValidDate(startDate)) {
      throw new DateParserError(`Invalid start date: ${startDate}`, startDate);
    }
    
    if (!this.isValidDate(endDate)) {
      throw new DateParserError(`Invalid end date: ${endDate}`, endDate);
    }
    
    if (startDate > endDate) {
      throw new DateParserError(`Start date must be before end date: ${startDate} > ${endDate}`);
    }

    // Check if date range is too large (optional safety check)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 365) {
      throw new DateParserError(`Date range too large: ${daysDiff} days (max 365)`);
    }
  }

  // Format output for display
  static formatDateRangeForDisplay(dateRange: DateRange): string {
    const { startDate, endDate } = dateRange;
    
    if (startDate === endDate) {
      return startDate;
    }
    
    return `${startDate} to ${endDate}`;
  }

  // Get relative description of date range
  static getRelativeDescription(dateRange: DateRange): string {
    const { startDate, endDate } = dateRange;
    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (startDate === endDate) {
      if (startDate === today) return 'today';
      if (startDate === yesterday) return 'yesterday';
      return startDate;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (endDate === yesterday && daysDiff === 7) return 'last 7 days';
    if (endDate === yesterday && daysDiff === 30) return 'last 30 days';
    
    return `${startDate} to ${endDate}`;
  }
}