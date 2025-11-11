import { validateConfig } from './index';

/**
 * Global setup runs before all tests
 */
async function globalSetup() {
  console.log('🚀 Setting up self-healing test framework...');
  
  try {
    // Validate configuration
    validateConfig();
    console.log('✅ Configuration validated');
    
    // Database will be initialized on first use
    console.log('✅ Database will be initialized on first use');
    
    console.log('✅ Global setup completed\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
