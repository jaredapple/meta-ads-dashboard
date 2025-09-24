#!/usr/bin/env node

const { DataValidationService } = require('./src/services/data-validation');

async function main() {
  const validator = new DataValidationService();
  
  try {
    const results = await validator.validateAllAccounts();
    
    // Offer to fix common issues
    const accountsWithIssues = results.filter(r => !r.isHealthy);
    
    if (accountsWithIssues.length > 0) {
      console.log('\n🔧 AUTOMATIC FIXES AVAILABLE');
      console.log('=' .repeat(40));
      
      for (const account of accountsWithIssues) {
        const fixesApplied = await validator.fixCommonIssues(account.accountId, account.accountName);
        if (fixesApplied > 0) {
          console.log(`✅ ${account.accountName}: ${fixesApplied} issues fixed`);
        }
      }
      
      console.log('\n💡 Re-run validation to see updated results');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);