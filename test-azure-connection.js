const { AzureOpenAI } = require('openai');
require('dotenv').config();

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

console.log('Testing Azure OpenAI connection...');
console.log('Endpoint:', process.env.AZURE_OPENAI_ENDPOINT);
console.log('Deployment:', process.env.AZURE_OPENAI_DEPLOYMENT);
console.log('API Version:', process.env.AZURE_OPENAI_API_VERSION);
console.log('API Key (first 10 chars):', process.env.AZURE_OPENAI_API_KEY?.substring(0, 10) + '...');

async function test() {
  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10,
    });
    
    console.log('\n✅ SUCCESS! Connection working!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.status) console.error('Status:', error.status);
  }
}

test();
