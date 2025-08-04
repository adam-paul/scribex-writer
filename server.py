import os
from flask import Flask, request
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)

CORS(app, resources={
    r"/process_text": {
        "origins": ["http://localhost:5173", "http://localhost:3000", "https://adam-paul.github.io", "https://scribex-writer-production.up.railway.app"],
        "methods": ["POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize OpenAI client
try:
    client = OpenAI()
    OPENAI_API_KEY_SET = True
except Exception as e:
    print(f"OpenAI API key not found or client could not be initialized: {e}")
    print("Please set the OPENAI_API_KEY environment variable.")
    client = None
    OPENAI_API_KEY_SET = False

# Note: Frontend is now served by SvelteKit
# This Flask server only handles the AI processing endpoint

@app.route('/process_text', methods=['POST'])
def process_text():
    text_content = request.form.get('editor_content')
    custom_prompt = request.form.get('custom_prompt')

    if not text_content:
        return "No text received.", 400

    if not custom_prompt:
        return "No system prompt received.", 400

    if not OPENAI_API_KEY_SET or not client:
        return "OpenAI API key not configured on the server.", 500

    try:
        # Make the API call to OpenAI using the prompt from frontend
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": custom_prompt.strip()},
                {"role": "user", "content": text_content}
            ]
        )
        llm_response = completion.choices[0].message.content
        return llm_response, 200

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return f"Error processing text with LLM: {str(e)}", 500

if __name__ == '__main__':
    if not OPENAI_API_KEY_SET:
        print("Warning: OPENAI_API_KEY is not set. LLM functionality will not work.")
    app.run(debug=True, port=5000) 