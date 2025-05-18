from flask import Flask, request, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('.', 'scribex.html')

@app.route('/img/<path:filename>')
def serve_image(filename):
    return send_from_directory('img', filename)

@app.route('/process_text', methods=['POST'])
def process_text():
    text_content = request.form.get('editor_content')
    if text_content:
        print("Received text:")
        print(text_content)
        return "Text received successfully!", 200
    return "No text received.", 400

if __name__ == '__main__':
    app.run(debug=True, port=5000) 