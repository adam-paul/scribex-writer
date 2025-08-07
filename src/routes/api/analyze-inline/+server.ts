import { error, json } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import type { InlineFeedback } from '$lib/models/Project';
import { getOpenAIClient } from '$lib/utils/openai';

// Load the inline feedback prompt
let INLINE_FEEDBACK_PROMPT = '';
try {
  INLINE_FEEDBACK_PROMPT = readFileSync(
    join(process.cwd(), 'static/prompts/inline-feedback.md'),
    'utf-8'
  );
} catch (e) {
  console.error('Failed to load inline-feedback.md:', e);
}

export const POST: RequestHandler = async ({ request }) => {
  const { textSegment, startPosition = 0 } = await request.json();
  
  // Validation
  if (!textSegment || textSegment.trim().length === 0) {
    return json({ feedback: [] });
  }
  
  
  if (!INLINE_FEEDBACK_PROMPT) {
    return error(500, 'Feedback prompt not loaded');
  }
  
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();
    
    // Prepare the prompt with JSON format instructions
    const systemPrompt = INLINE_FEEDBACK_PROMPT + `
    
    Analyze the text and provide ONE piece of feedback for the entire segment.
    Focus on the most important aspect that would help the student improve.
    
    Return your response as JSON:
    {
      "type": "grammar" | "clarity" | "flow" | "tone" | "praise",
      "message": "Your brief question or observation (under 25 words)"
    }`;
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: textSegment }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 150
    });
    
    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Create feedback item at the END of the analyzed segment
    const endPosition = startPosition + textSegment.length;
    const feedback: InlineFeedback[] = [];
    
    if (aiResponse.type && aiResponse.message) {
      feedback.push({
        id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: aiResponse.type,
        message: aiResponse.message,
        startIndex: startPosition,
        endIndex: endPosition,
        createdAt: new Date().toISOString(),
        dismissed: false
      });
    }
    
    return json({ feedback });
    
  } catch (e) {
    console.error('Error calling OpenAI API:', e);
    return error(500, `Failed to analyze text: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};