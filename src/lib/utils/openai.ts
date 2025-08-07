import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      _client = new OpenAI({ apiKey });
    } catch (e) {
      throw new Error(`Failed to initialize OpenAI client: ${e}`);
    }
  }
  
  return _client;
}