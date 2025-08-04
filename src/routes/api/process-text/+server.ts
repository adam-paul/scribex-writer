import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import type { RequestHandler } from './$types';

// Initialize OpenAI client
let openai: OpenAI | null = null;

try {
  openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
} catch (e) {
  console.error('Failed to initialize OpenAI client:', e);
}

export const POST: RequestHandler = async ({ request }) => {
  // Parse the request body
  const formData = await request.formData();
  const editorContent = formData.get('editor_content') as string;
  const customPrompt = formData.get('custom_prompt') as string;

  // Validate inputs
  if (!editorContent) {
    return error(400, 'No text received.');
  }

  if (!customPrompt) {
    return error(400, 'No system prompt received.');
  }

  if (!openai) {
    return error(500, 'OpenAI API key not configured on the server.');
  }

  try {
    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: customPrompt.trim() },
        { role: 'user', content: editorContent }
      ]
    });

    const llmResponse = completion.choices[0].message.content;
    
    // Return plain text response to match Flask behavior
    return new Response(llmResponse, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (e) {
    console.error('Error calling OpenAI API:', e);
    return error(500, `Error processing text with LLM: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};