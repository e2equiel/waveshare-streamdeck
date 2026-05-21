import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import io
import plistlib
import base64
import uuid
import json
import shutil
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

@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")

controllers: dict[str, WaveshareController] = {}
executor = ActionExecutor()

def key_handler(device_id, c, r, pressed):
    if not pressed:
        return
    logger.info(f"Key Pressed on {device_id}: {c}, {r}")
    controller = controllers.get(device_id)
    if not controller: return
    page_config = controller.config.get("pages", {}).get(controller.current_page, {})
    action = page_config.get(f"{c}_{r}")
    if action:
        action_type = action.get("type")
        if action_type == "switch_page":
            target = action.get("payload")
            if target and target in controller.config.get("pages", {}):
                controller.current_page = target
                controller.navigation_stack.clear() # Clear stack on direct jump
                controller.render_screen(controller.config)
        elif action_type == "folder":
            target = action.get("payload")
            if target and target in controller.config.get("pages", {}):
                controller.navigation_stack.append(controller.current_page)
                controller.current_page = target
                controller.render_screen(controller.config)
        elif action_type == "back_button":
            if controller.navigation_stack:
                controller.current_page = controller.navigation_stack.pop()
            else:
                controller.current_page = "main"
            controller.render_screen(controller.config)
        else:
            # We pass the single action to executor since executor doesn't need to know pagination
            executor.execute(f"{c}_{r}", page_config)

def on_connected(device_id):
    logger.info(f"Device {device_id} connected, re-rendering screen...")
    controller = controllers.get(device_id)
    if not controller: return
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
            device_config = config.get("devices", {}).get(device_id, {"pages": {"main": {}}, "settings": {"brightness": 50}})
            controller.render_screen(device_config)
    except:
        pass

@app.on_event("startup")
def startup_event():
    temp_controller = WaveshareController()
    ports = temp_controller.get_available_ports()
    
    if not ports:
        logger.warning("No compatible Waveshare Stream Deck found on startup.")
        
    for port in ports:
        c = WaveshareController(port_name=port)
        c.on_key_state_changed = key_handler
        c.on_connected = on_connected
        
        # Load config to render immediately
        device_config = {"pages": {"main": {}}, "settings": {"brightness": 50}}
        if os.path.exists('config.json'):
            try:
                with open('config.json', 'r') as f:
                    config = json.load(f)
                    device_config = config.get("devices", {}).get(port, device_config)
            except: pass
            
        c.render_screen(device_config)
        if c.connect():
            controllers[port] = c
            logger.info(f"Connected to {port}")
        else:
            logger.warning(f"Failed to connect to {port}")

@app.on_event("shutdown")
def shutdown_event():
    for c in controllers.values():
        c.disconnect()

class ActionRequest(BaseModel):
    col: int
    row: int
    action_type: str
    payload: str | list
    image_path: str = ""

@app.get("/api/devices")
def get_devices():
    return [{"id": k, "model": c.device_model} for k, c in controllers.items()]

def migrate_config():
    if not os.path.exists('config.json'):
        return {"devices": {}}
    with open('config.json', 'r') as f:
        try:
            config = json.load(f)
        except:
            return {"devices": {}}
            
    if "devices" in config:
        return config
        
    # Migrate old config
    migrated = {"devices": {}}
    if "pages" in config:
        # If there's an active controller, assign this config to it, or a generic default
        default_id = list(controllers.keys())[0] if controllers else "default"
        migrated["devices"][default_id] = config
    elif config and "main" in config:
        default_id = list(controllers.keys())[0] if controllers else "default"
        migrated["devices"][default_id] = {
            "pages": {"main": config},
            "settings": {"brightness": 50}
        }
    with open('config.json', 'w') as out:
        json.dump(migrated, out, indent=4)
    return migrated

@app.get("/api/config")
def get_config(device_id: str = ""):
    config = migrate_config()
    
    if not device_id and controllers:
        device_id = list(controllers.keys())[0]
        
    return config.get("devices", {}).get(device_id, {"pages": {"main": {}}, "settings": {"brightness": 50}})

@app.post("/api/config")
def set_config(req: dict, device_id: str = ""):
    config = migrate_config()
    
    if not device_id and controllers:
        device_id = list(controllers.keys())[0]
        
    if not device_id:
        return {"status": "error", "message": "No device ID provided or available"}
        
    if "devices" not in config:
        config["devices"] = {}
    config["devices"][device_id] = req
    
    with open('config.json', 'w') as f:
        json.dump(config, f, indent=4)
        
    controller = controllers.get(device_id)
    if controller:
        if "settings" in req and "brightness" in req["settings"]:
            controller.set_brightness(req["settings"]["brightness"])
        controller.render_screen(req)
        
    return {"status": "success"}

@app.get("/api/layout")
def get_layout(device_id: str = ""):
    if not device_id and controllers:
        device_id = list(controllers.keys())[0]
        
    controller = controllers.get(device_id)
    if not controller:
        return {"width": 1024, "height": 600, "rects": [], "model": "Unknown"}
        
    return {
        "width": controller.device_width,
        "height": controller.device_height,
        "rects": controller.raw_rects,
        "model": controller.device_model
    }

@app.post("/api/brightness")
def set_brightness(level: int, device_id: str = ""):
    if not device_id and controllers:
        device_id = list(controllers.keys())[0]
        
    controller = controllers.get(device_id)
    if controller:
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

@app.get("/api/extract_app_icon")
def extract_app_icon(app_path: str):
    """Extracts the app icon, saves it permanently to disk with a hashed name, and returns the path."""
    if not app_path.endswith('.app') or not os.path.exists(app_path):
        raise HTTPException(status_code=404, detail="App not found")
        
    icon_bytes = get_mac_app_icon_bytes(app_path)
    if not icon_bytes:
        raise HTTPException(status_code=404, detail="Icon not found")
        
    filename = f"{uuid.uuid4().hex}.png"
    os.makedirs("static/uploads", exist_ok=True)
    file_path = os.path.join("static", "uploads", filename)
    
    with open(file_path, "wb") as f:
        f.write(icon_bytes)
        
    return {"path": f"/static/uploads/{filename}"}

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

@app.post("/api/upload_file")
async def upload_file(request: Request):
    """Saves a raw file upload (e.g. for animated GIFs) and returns the path."""
    try:
        # Get filename from header or default to gif since we only use this for gifs now
        filename_header = request.headers.get('X-File-Name', 'upload.gif')
        ext = filename_header.split('.')[-1] if '.' in filename_header else 'gif'
        filename = f"{uuid.uuid4().hex}.{ext}"
        os.makedirs("static/uploads", exist_ok=True)
        file_path = os.path.join("static", "uploads", filename)
        
        body = await request.body()
        with open(file_path, "wb") as buffer:
            buffer.write(body)
            
        web_path = f"/static/uploads/{filename}"
        return {"path": web_path}
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=400, detail="File upload failed")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
