// Test script to verify LLM configuration works with ngrok/OpenAI Compatible endpoints
// Run with: node test-llm-config.js

const { getLLMConfig, createOpenAIClient } = require('./lib/openai-config.ts');

async function testLLMConfig() {
  console.log('Testing LLM Configuration...\n');
  
  try {
    // Test getting LLM config
    const config = await getLLMConfig();
    console.log('✅ LLM Config retrieved:');
    console.log('  Provider:', config?.provider);
    console.log('  Model:', config?.model);
    console.log('  Base URL:', config?.baseUrl || 'N/A (using default)');
    console.log('  API Key exists:', !!config?.apiKey);
    
    if (!config) {
      console.log('\n❌ No LLM configuration found. Please configure in settings or set environment variables.');
      return;
    }
    
    // Test creating OpenAI client
    console.log('\nTesting OpenAI client creation...');
    const client = await createOpenAIClient();
    
    if (client) {
      console.log('✅ OpenAI client created successfully');
      
      // Test a simple API call
      console.log('\nTesting API call...');
      const completion = await client.chat.completions.create({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello from ngrok/OpenAI Compatible endpoint!"' }
        ],
        max_tokens: 50,
      });
      
      console.log('✅ API call successful!');
      console.log('Response:', completion.choices[0]?.message?.content);
    } else {
      console.log('❌ Failed to create OpenAI client');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Instructions for testing
console.log(`
=== LLM Configuration Test ===

To test the AI enhancement functionality:

1. Make sure your LLM settings are configured in the Settings page:
   - Provider: "OpenAI Compatible (ngrok/lm-studio/vllm)"
   - Base URL: Your ngrok or local endpoint (e.g., "https://xxxx.ngrok.io/v1")
   - API Key: Your API key (can be any string for local models)

2. Or set environment variables:
   - OPENAI_API_KEY=your-api-key
   - LLM_PROVIDER=openai-compatible
   - LLM_BASE_URL=https://xxxx.ngrok.io/v1
   - LLM_MODEL=default

3. Run the test script

4. Test the "Enhance with AI" button on the Proposal Creator page

`);

if (require.main === module) {
  testLLMConfig();
}

module.exports = { testLLMConfig };
