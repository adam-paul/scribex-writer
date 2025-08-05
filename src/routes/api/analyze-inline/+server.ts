import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InlineFeedback } from '$lib/models/Project';

export const POST: RequestHandler = async ({ request }) => {
  const { textSegment, startPosition = 0 } = await request.json();
  
  console.log('=== Analyze Inline API ===');
  console.log('Text segment:', textSegment);
  console.log('Start position:', startPosition);
  console.log('Segment length:', textSegment.length);
  
  // For mock feedback: Create a single feedback item at the END of the entire analyzed segment
  const mockFeedback: InlineFeedback[] = [];
  
  if (textSegment.length > 0) {
    // The feedback marker should appear at the END of all analyzed text
    const endPosition = startPosition + textSegment.length;
    
    // Determine feedback type based on segment characteristics
    let feedbackType: 'praise' | 'clarity' | 'flow' | 'tone' = 'praise';
    let message = 'Good work on this section!';
    
    // Simple mock logic for varying feedback
    if (textSegment.includes('?')) {
      feedbackType = 'clarity';
      message = 'Consider if this question effectively engages your reader.';
    } else if (textSegment.includes('\n\n')) {
      feedbackType = 'flow';
      message = 'Nice paragraph structure! How do these ideas connect?';
    } else if (textSegment.length > 150) {
      feedbackType = 'tone';
      message = 'This is a substantial section. Is the tone consistent throughout?';
    } else if (textSegment.match(/^[A-Z]/)) {
      feedbackType = 'praise';
      message = 'Strong opening! Keep building on this.';
    }
    
    // Create a single feedback item for the ENTIRE analyzed segment
    mockFeedback.push({
      id: `feedback_${Date.now()}`,
      type: feedbackType,
      message: message,
      startIndex: startPosition,  // Start of analyzed segment
      endIndex: endPosition,      // End of analyzed segment (marker appears here)
      createdAt: new Date().toISOString(),
      dismissed: false
    });
    
    console.log(`Created feedback for positions ${startPosition} to ${endPosition}`);
    console.log(`Feedback type: ${feedbackType}`);
    console.log(`Message: ${message}`);
  }
  
  console.log(`Returning ${mockFeedback.length} feedback item(s)`);
  console.log('=========================');
  
  return json({
    feedback: mockFeedback
  });
};