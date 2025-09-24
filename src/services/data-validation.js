const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DataValidationService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async validateAccountData(accountId, accountName) {
    console.log(`\n🔍 Validating data quality for ${accountName}`);
    const issues = [];
    const warnings = [];
    
    // Check for recent data
    const recentDataCheck = await this.checkRecentData(accountId);
    if (recentDataCheck.hasIssue) {
      issues.push(recentDataCheck);
    } else if (recentDataCheck.hasWarning) {
      warnings.push(recentDataCheck);
    }

    // Check for missing metrics
    const metricsCheck = await this.checkMissingMetrics(accountId);
    if (metricsCheck.hasIssue) {
      issues.push(metricsCheck);
    }

    // Check for data consistency
    const consistencyCheck = await this.checkDataConsistency(accountId);
    if (consistencyCheck.hasIssue) {
      issues.push(consistencyCheck);
    }

    // Check for unusual values
    const outlierCheck = await this.checkOutliers(accountId);
    if (outlierCheck.hasWarning) {
      warnings.push(outlierCheck);
    }

    return {
      accountId,
      accountName,
      issues,
      warnings,
      isHealthy: issues.length === 0,
      timestamp: new Date().toISOString()
    };
  }

  async checkRecentData(accountId) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data, error } = await this.supabase
      .from('daily_ad_insights')
      .select('date_start')
      .eq('account_id', accountId)
      .gte('date_start', threeDaysAgo.toISOString().split('T')[0])
      .order('date_start', { ascending: false })
      .limit(1);

    if (error) {
      return {
        check: 'recent_data',
        hasIssue: true,
        message: `Database error: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      return {
        check: 'recent_data',
        hasIssue: true,
        message: 'No data found in the last 3 days'
      };
    }

    const latestDate = new Date(data[0].date_start);
    const daysSinceLatest = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLatest > 2) {
      return {
        check: 'recent_data',
        hasWarning: true,
        message: `Latest data is ${daysSinceLatest} days old (${data[0].date_start})`
      };
    }

    return {
      check: 'recent_data',
      hasIssue: false,
      message: `Latest data: ${data[0].date_start}`
    };
  }

  async checkMissingMetrics(accountId) {
    const { data, error } = await this.supabase
      .from('daily_ad_insights')
      .select('date_start, impressions, clicks, spend, conversions, conversion_values, roas, ctr, cpc, cpm')
      .eq('account_id', accountId)
      .gte('date_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error || !data) {
      return {
        check: 'missing_metrics',
        hasIssue: true,
        message: 'Unable to fetch recent data for validation'
      };
    }

    const totalRecords = data.length;
    const missingMetrics = {
      roas: data.filter(r => !r.roas || r.roas === 0).length,
      ctr: data.filter(r => !r.ctr || r.ctr === 0).length,
      cpc: data.filter(r => !r.cpc || r.cpc === 0).length,
      conversions: data.filter(r => !r.conversions || r.conversions === 0).length
    };

    const issues = [];
    Object.entries(missingMetrics).forEach(([metric, count]) => {
      const percentage = (count / totalRecords) * 100;
      if (percentage > 50) {
        issues.push(`${metric.toUpperCase()}: ${count}/${totalRecords} records missing (${percentage.toFixed(1)}%)`);
      }
    });

    return {
      check: 'missing_metrics',
      hasIssue: issues.length > 0,
      message: issues.length > 0 ? issues.join('; ') : 'All key metrics present',
      details: missingMetrics
    };
  }

  async checkDataConsistency(accountId) {
    const { data, error } = await this.supabase
      .from('daily_ad_insights')
      .select('date_start, impressions, clicks, spend')
      .eq('account_id', accountId)
      .gte('date_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('impressions', 0);

    if (error || !data) {
      return {
        check: 'data_consistency',
        hasIssue: false,
        message: 'Unable to validate consistency'
      };
    }

    const inconsistencies = [];
    
    data.forEach(record => {
      // Check for clicks > impressions
      if (record.clicks > record.impressions) {
        inconsistencies.push(`${record.date_start}: clicks (${record.clicks}) > impressions (${record.impressions})`);
      }
      
      // Check for negative values
      if (record.spend < 0 || record.clicks < 0 || record.impressions < 0) {
        inconsistencies.push(`${record.date_start}: negative values detected`);
      }
    });

    return {
      check: 'data_consistency',
      hasIssue: inconsistencies.length > 0,
      message: inconsistencies.length > 0 
        ? `${inconsistencies.length} consistency issues found` 
        : 'Data consistency looks good',
      details: inconsistencies.slice(0, 3) // Show first 3 issues
    };
  }

  async checkOutliers(accountId) {
    const { data, error } = await this.supabase
      .from('daily_ad_insights')
      .select('date_start, spend, roas, ctr')
      .eq('account_id', accountId)
      .gte('date_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('spend', 0);

    if (error || !data || data.length < 5) {
      return {
        check: 'outliers',
        hasWarning: false,
        message: 'Insufficient data for outlier detection'
      };
    }

    const spends = data.map(r => r.spend).filter(s => s > 0);
    const roasValues = data.map(r => r.roas).filter(r => r > 0);
    
    const avgSpend = spends.reduce((a, b) => a + b, 0) / spends.length;
    const avgROAS = roasValues.length > 0 ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : 0;
    
    const outliers = [];
    
    // Check for unusually high spend (>3x average)
    const highSpend = data.filter(r => r.spend > avgSpend * 3);
    if (highSpend.length > 0) {
      outliers.push(`High spend days: ${highSpend.length} (max: $${Math.max(...highSpend.map(r => r.spend)).toFixed(2)})`);
    }
    
    // Check for unusually high ROAS (>10x average)
    if (avgROAS > 0) {
      const highROAS = data.filter(r => r.roas > avgROAS * 10);
      if (highROAS.length > 0) {
        outliers.push(`Extremely high ROAS: ${highROAS.length} days`);
      }
    }

    return {
      check: 'outliers',
      hasWarning: outliers.length > 0,
      message: outliers.length > 0 
        ? `Potential outliers detected: ${outliers.join('; ')}` 
        : 'No significant outliers detected',
      details: {
        avgSpend: avgSpend.toFixed(2),
        avgROAS: avgROAS.toFixed(2),
        dataPoints: data.length
      }
    };
  }

  async validateAllAccounts() {
    console.log('🔍 STARTING DATA VALIDATION FOR ALL ACCOUNTS');
    console.log('=' .repeat(60));

    const { data: accounts, error } = await this.supabase
      .from('client_accounts')
      .select('id, client_name, meta_account_id')
      .eq('is_active', true);

    if (error || !accounts) {
      console.error('❌ Could not fetch accounts for validation');
      return;
    }

    const validationResults = [];

    for (const account of accounts) {
      const result = await this.validateAccountData(account.meta_account_id, account.client_name);
      validationResults.push(result);
      
      // Print results
      console.log(`\n📊 ${account.client_name} (${account.meta_account_id})`);
      
      if (result.isHealthy) {
        console.log('  ✅ Data quality: HEALTHY');
      } else {
        console.log('  ⚠️  Data quality: ISSUES FOUND');
        result.issues.forEach(issue => {
          console.log(`     ❌ ${issue.check}: ${issue.message}`);
        });
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`     ⚠️  ${warning.check}: ${warning.message}`);
        });
      }
    }

    // Summary
    console.log('\n📋 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    const healthyAccounts = validationResults.filter(r => r.isHealthy).length;
    const totalAccounts = validationResults.length;
    
    console.log(`Accounts validated: ${totalAccounts}`);
    console.log(`Healthy accounts: ${healthyAccounts}`);
    console.log(`Accounts with issues: ${totalAccounts - healthyAccounts}`);
    
    if (totalAccounts > 0) {
      console.log(`Overall health: ${((healthyAccounts / totalAccounts) * 100).toFixed(1)}%`);
    }

    return validationResults;
  }

  async fixCommonIssues(accountId, accountName) {
    console.log(`\n🔧 Attempting to fix common issues for ${accountName}`);
    
    let fixesApplied = 0;

    // Fix missing computed metrics
    const { data: records } = await this.supabase
      .from('daily_ad_insights')
      .select('id, impressions, clicks, spend, conversion_values, ctr, cpc, cpm, roas')
      .eq('account_id', accountId)
      .gte('date_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (records) {
      for (const record of records) {
        const updates = {};
        let needsUpdate = false;

        if ((!record.ctr || record.ctr === 0) && record.impressions > 0 && record.clicks > 0) {
          updates.ctr = parseFloat(((record.clicks / record.impressions) * 100).toFixed(4));
          needsUpdate = true;
        }

        if ((!record.cpc || record.cpc === 0) && record.clicks > 0 && record.spend > 0) {
          updates.cpc = parseFloat((record.spend / record.clicks).toFixed(4));
          needsUpdate = true;
        }

        if ((!record.cpm || record.cpm === 0) && record.impressions > 0 && record.spend > 0) {
          updates.cpm = parseFloat(((record.spend / record.impressions) * 1000).toFixed(4));
          needsUpdate = true;
        }

        if ((!record.roas || record.roas === 0) && record.spend > 0 && record.conversion_values > 0) {
          updates.roas = parseFloat((record.conversion_values / record.spend).toFixed(4));
          needsUpdate = true;
        }

        if (needsUpdate) {
          await this.supabase
            .from('daily_ad_insights')
            .update(updates)
            .eq('id', record.id);
          fixesApplied++;
        }
      }
    }

    console.log(`  ✅ Applied ${fixesApplied} fixes to computed metrics`);
    return fixesApplied;
  }
}

module.exports = { DataValidationService };