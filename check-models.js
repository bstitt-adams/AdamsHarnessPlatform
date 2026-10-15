// Test script to check available models via OpenAI-compatible endpoint
const { createOpenAIClient, getLLMConfig } = require('./lib/openai-config.ts');

async function checkAvailableModels() {
  console.log('Checking available models...\n');
  
  try {
    const config = await getLLMConfig();
    if (!config) {
      console.log('❌ No LLM configuration found');
      return;
    }
    
    console.log('📋 Configuration:');
    console.log('  Provider:', config.provider);
    console.log('  Base URL:', config.baseUrl);
    console.log('  Model:', config.model);
    
    const client = await createOpenAIClient();
    if (!client) {
      console.log('❌ Failed to create client');
      return;
    }
    
    console.log('\n🔍 Fetching available models...');
    const models = await client.models.list();
    
    console.log('\n📝 Available models:');
    models.data.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.id}`);
    });
    
    console.log('\n💡 Recommendation:');
    console.log('Update your .env.local with one of these models:');
    console.log(`LLM_MODEL=${models.data[0]?.id || 'default'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Instructions
console.log(`
=== Model Availability Check ===

This script will:
1. Load your LLM configuration
2. Connect to your ngrok/OpenAI-compatible endpoint
3. List all available models
4. Recommend the correct model name to use

Run with: node check-models.js

`);

if (require.main === module) {
  checkAvailableModels();
}

module.exports = { checkAvailableModels };
