import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import io
import plistlib
import base64
import uuid
import json
from PIL import Image

from waveshare_controller import WaveshareController, get_mac_app_icon_bytes
from action_executor import ActionExecutor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('streamdeck_debug.log', mode='a')
    ]
)
logger = logging.getLogger("Server")

app = FastAPI()

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# Mount static files (UI)
app.mount("/static", StaticFiles(directory="static"), name="static")

controller = WaveshareController()
executor = ActionExecutor()

def key_handler(c, r, pressed):
    if not pressed:
        return
    logger.info(f"Key Pressed: {c}, {r}")
    page_config = controller.config.get("pages", {}).get(controller.current_page, {})
    action = page_config.get(f"{c}_{r}")
    if action:
        if action.get("type") == "switch_page":
            target = action.get("payload")
            if target and target in controller.config.get("pages", {}):
                controller.current_page = target
                controller.render_screen(controller.config)
        else:
            # We pass the single action to executor since executor doesn't need to know pagination
            executor.execute(f"{c}_{r}", page_config)

controller.on_key_state_changed = key_handler

def on_connected():
    logger.info("Device connected, re-rendering screen with correct dimensions...")
    # Read config to get full dict
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
            controller.render_screen(config)
    except:
        pass

controller.on_connected = on_connected

@app.on_event("startup")
def startup_event():
    # Render config immediately with default dimensions
    controller.render_screen(executor.config)
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
    if not os.path.exists('config.json'):
        return {"pages": {"main": {}}, "settings": {"brightness": 50}}
    with open('config.json', 'r') as f:
        config = json.load(f)
        # Migration from v1 to v2
        if "pages" not in config:
            migrated = {
                "pages": {
                    "main": config
                },
                "settings": {
                    "brightness": 50
                }
            }
            with open('config.json', 'w') as out:
                json.dump(migrated, out, indent=4)
            return migrated
        return config

@app.post("/api/config")
def set_config(req: dict):
    with open('config.json', 'w') as f:
        json.dump(req, f, indent=4)
        
    # Update brightness if changed
    if "settings" in req and "brightness" in req["settings"]:
        controller.set_brightness(req["settings"]["brightness"])
        
    controller.render_screen(req)
    executor.config = req # In case it needs it, though it uses page_config now
    return {"status": "success"}

@app.get("/api/layout")
def get_layout():
    return {
        "width": controller.device_width,
        "height": controller.device_height,
        "rects": controller.raw_rects,
        "model": controller.device_model
    }

@app.post("/api/brightness")
def set_brightness(level: int):
    controller.set_brightness(level)
    return {"status": "success"}

@app.get("/api/apps")
def get_apps():
    """Returns a list of installed macOS applications."""
    apps = []
    for path in ['/Applications', '/System/Applications']:
        if os.path.exists(path):
            try:
                for f in os.listdir(path):
                    if f.endswith('.app'):
                        apps.append({"name": f.replace('.app', ''), "path": os.path.join(path, f)})
            except PermissionError:
                pass
    return sorted(apps, key=lambda x: x['name'].lower())

@app.get("/api/app_icon")
def get_app_icon(app_path: str):
    """Extracts and returns the app icon as a PNG."""
    if not app_path.endswith('.app') or not os.path.exists(app_path):
        raise HTTPException(status_code=404, detail="App not found")
        
    icon_bytes = get_mac_app_icon_bytes(app_path)
    if icon_bytes:
        return StreamingResponse(io.BytesIO(icon_bytes), media_type="image/png")
    raise HTTPException(status_code=404, detail="Icon not found")

class Base64Upload(BaseModel):
    image_data: str # Data URI "data:image/png;base64,..."

@app.post("/api/upload_base64")
def upload_base64(req: Base64Upload):
    """Saves a base64 string to a file and returns the path."""
    try:
        header, encoded = req.image_data.split(",", 1)
        data = base64.b64decode(encoded)
        
        ext = "png"
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
            
        filename = f"{uuid.uuid4().hex}.{ext}"
        os.makedirs("static/uploads", exist_ok=True)
        file_path = os.path.join("static", "uploads", filename)
        
        with open(file_path, "wb") as f:
            f.write(data)
            
        # Return the web-accessible path so the browser can preview it immediately
        web_path = f"/static/uploads/{filename}"
        return {"path": web_path}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
