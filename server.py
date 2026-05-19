import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os

from waveshare_controller import WaveshareController
from action_executor import ActionExecutor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Server")

app = FastAPI()

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# Mount static files (UI)
app.mount("/static", StaticFiles(directory="static"), name="static")

controller = WaveshareController()
executor = ActionExecutor()

def on_key_event(col: int, row: int, pressed: bool):
    if pressed:
        logger.info(f"Key Pressed: {col}, {row}")
        executor.execute(col, row)

controller.on_key_state_changed = on_key_event

@app.on_event("startup")
def startup_event():
    if not controller.connect():
        logger.warning("Failed to connect to Stream Deck on startup.")

@app.on_event("shutdown")
def shutdown_event():
    controller.disconnect()

class ActionRequest(BaseModel):
    col: int
    row: int
    action_type: str
    payload: str | list
    image_path: str = ""

@app.get("/api/config")
def get_config():
    return executor.config

@app.post("/api/config")
def set_config(req: ActionRequest):
    executor.set_action(req.col, req.row, req.action_type, req.payload, req.image_path)
    # If image_path exists, we could send it to the device right away
    if req.image_path and os.path.exists(req.image_path):
        controller.send_image(req.image_path, req.col, req.row)
    return {"status": "success"}

@app.post("/api/brightness")
def set_brightness(level: int):
    controller.set_brightness(level)
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
