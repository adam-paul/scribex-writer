import os
from flask import Flask, request, send_from_directory
from flask_cors import CORS # Import Flask-CORS
from openai import OpenAI

app = Flask(__name__)
# CORS(app) # Initialize CORS with default settings (allow all origins)
# For production, you should restrict origins, e.g.:
CORS(app, resources={r"/process_text": {"origins": "https://adam-paul.github.io"}})

# Initialize OpenAI client
# It will automatically look for the OPENAI_API_KEY environment variable
try:
    client = OpenAI()
    OPENAI_API_KEY_SET = True
except Exception as e: # More specific error catching might be better
    print(f"OpenAI API key not found or client could not be initialized: {e}")
    print("Please set the OPENAI_API_KEY environment variable.")
    client = None
    OPENAI_API_KEY_SET = False

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/img/<path:filename>')
def serve_image(filename):
    return send_from_directory('img', filename)

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
            model="gpt-4o", # Or your preferred model
            messages=[
                {"role": "system", "content": custom_prompt.strip()},
                {"role": "user", "content": text_content}
            ]
        )
        llm_response = completion.choices[0].message.content
        return llm_response, 200 # Send LLM response back to client

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return f"Error processing text with LLM: {str(e)}", 500

if __name__ == '__main__':
    if not OPENAI_API_KEY_SET:
        print("Warning: OPENAI_API_KEY is not set. LLM functionality will not work.")
    app.run(debug=True, port=5000) 