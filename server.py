import eventlet
eventlet.monkey_patch()

from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_socketio import SocketIO
import os
import base64

app = Flask(__name__, static_folder="static", template_folder="templates")
socketio = SocketIO(app)

solved = {}
solved_data = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    image_id = request.form.get("image_id")

    if not file or not image_id:
        return "Missing file or image_id", 400

    image_bytes = file.read()
    solved[image_id] = None
    solved_data[image_id] = image_bytes

    b64 = base64.b64encode(image_bytes).decode()
    socketio.emit("new_captcha", {
        "image_id": image_id,
        "image_data": b64
    })

    return jsonify({"number": None}), 200

@app.route("/submit", methods=["POST"])
def submit():
    image_id = request.form.get("image_id")
    answer = request.form.get("answer")

    if image_id and answer:
        solved[image_id] = answer
        socketio.emit("solved", {
            "image_id": image_id,
            "number": answer
        })
        if image_id in solved_data:
            del solved_data[image_id]
        return jsonify({"success": True})
    return "Thiếu dữ liệu", 400

@app.route("/result/<image_id>")
def result(image_id):
    answer = solved.get(image_id)
    if answer:
        return jsonify({"number": answer})
    return jsonify({"success": False}), 404

@app.route("/sound.mp3")
def sound():
    return send_from_directory("static/sound", "alert.mp3", mimetype="audio/mpeg")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
