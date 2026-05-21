import serial
import serial.tools.list_ports
import threading
import time
import json
import logging
from PIL import Image
import io
import os
import plistlib
import subprocess
import tempfile
from typing import Callable, Optional

try:
    import simplejpeg
    import numpy as np
    HAS_SIMPLEJPEG = True
except ImportError:
    HAS_SIMPLEJPEG = False

from waveshare_protocol import pack_json, pack_jpg, StreamDeckParser, CmdValue

# Set up logging
logger = logging.getLogger("WaveshareController")
# Set to INFO to avoid spamming the console with SHOW_JPG debug logs
logger.setLevel(logging.INFO)

def get_mac_app_icon_bytes(app_path: str) -> bytes:
    """Uses macOS sips to convert the app's .icns to PNG bytes."""
    plist_path = os.path.join(app_path, 'Contents', 'Info.plist')
    icon_file = "AppIcon.icns"
    if os.path.exists(plist_path):
        try:
            with open(plist_path, 'rb') as f:
                pl = plistlib.load(f)
                icon_file = pl.get('CFBundleIconFile', icon_file)
                if not icon_file.endswith('.icns'): icon_file += '.icns'
        except: pass
    
    # Special cases
    if "Calendar.app" in app_path:
        icon_file = "App-empty.icns"

    full_path = os.path.join(app_path, 'Contents', 'Resources', icon_file)
    if not os.path.exists(full_path):
        import glob
        found = glob.glob(os.path.join(app_path, 'Contents', 'Resources', '*.icns'))
        if found: full_path = found[0]
        else: return b""
        
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        temp_path = tf.name
        
    try:
        subprocess.run(["sips", "-s", "format", "png", full_path, "--out", temp_path], check=True, capture_output=True)
        with open(temp_path, "rb") as f:
            data = f.read()
        return data
    except Exception as e:
        logger.error(f"sips failed for {full_path}: {e}")
        return b""
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

class WaveshareController:
    def __init__(self, port_name: Optional[str] = None):
        self.port_name = port_name
        self.serial_port = None
        self.parser = StreamDeckParser()
        self.packet_id = 1
        
        self.running = False
        self.read_thread = None
        self.pending_render = False
        self.page_cache = {}
        self.image_cache = {} # Cache for origin image files to prevent disk reads and rescaling on page change
        
        # Callbacks
        self.on_key_pressed: Optional[Callable[[str, int, int], None]] = None
        self.on_key_state_changed: Callable[[str, int, int, bool], None] = None
        self.on_connected: Optional[Callable[[str], None]] = None
        self.on_disconnected: Callable[[str], None] = None
        
        self.device_model = "Unknown"
        self.device_width = 1024 # Default guess, will update on getInfo
        self.device_height = 600
        self.button_rects = {}
        self.raw_rects = []
        
        self.cached_jpg = None
        self.config = {}
        self.current_page = "main"
        self.navigation_stack = []
        
        # Animation
        self.animated_elements = [] # list of dicts with icon, x, y, frame_durations, current_frame, next_update
        self.static_background = None
        self.animation_lock = threading.Lock()
        self.animation_thread = None

    def get_available_ports(self):
        """Find the device automatically based on known PIDs/VIDs."""
        available = []
        for port in serial.tools.list_ports.comports():
            # MK Series Upper Computer VIDs/PIDs
            if (port.vid == 0x1d6b and port.pid == 0x0104) or \
               (port.vid == 0x1234 and port.pid == 0x5678):
                available.append(port.device)
        return available

    def connect(self) -> bool:
        if not self.port_name:
            ports = self.get_available_ports()
            if not ports:
                logger.error("No compatible Waveshare Stream Deck found.")
                return False
            self.port_name = ports[0]
            
        try:
            self.serial_port = serial.Serial(
                port=self.port_name,
                baudrate=115200,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=0.1
            )
            
            # Send initial empty buffer (like C++ demo does)
            self.serial_port.write(b'0' * 1024)
            
            self.running = True
            self.read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self.read_thread.start()
            
            self.animation_thread = threading.Thread(target=self._animation_loop, daemon=True)
            self.animation_thread.start()
            
            # Request info
            self.send_json({"method": "getInfo"})
            
            if self.on_connected:
                self.on_connected(self.port_name)
                
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.port_name}: {e}")
            return False

    def disconnect(self):
        self.running = False
        if self.read_thread:
            self.read_thread.join(timeout=1.0)
        if self.animation_thread:
            self.animation_thread.join(timeout=1.0)
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        if self.on_disconnected:
            self.on_disconnected(self.port_name)

    def _get_next_id(self) -> int:
        cur = self.packet_id
        self.packet_id += 1
        return cur

    def send_json(self, data: dict):
        if not self.serial_port or not self.serial_port.is_open:
            return
        pkt = pack_json(data, self._get_next_id())
        self.serial_port.write(pkt)

    def set_brightness(self, level: int):
        """Set screen brightness (0-100)."""
        self.send_json({
            "method": "setBacklight",
            "parameters": {"level": max(0, min(100, level))}
        })

    def render_screen(self, config: dict):
        """Composites all static elements and prepares animated elements."""
        with self.animation_lock:
            try:
                self.config = config
                # Create a black background
                screen = Image.new('RGB', (self.device_width, self.device_height), color=(0, 0, 0))
                self.animated_elements = []
                
                # Render elements for current page
                page_config = config.get("pages", {}).get(self.current_page, {})
                
                for key, action in page_config.items():
                    if not action.get("image"):
                        continue
                    try:
                        # Find rect. Key can be "c_r" (button) or "extra_X" (non-button rects)
                        rect = None
                        if "_" in key and key.split("_")[0].isdigit():
                            c, r = int(key.split('_')[0]), int(key.split('_')[1])
                            rect = self.button_rects.get((c, r))
                        else:
                            # Extra rects (e.g. clock) matching the key
                            for r in self.raw_rects:
                                if not r.get("isKey"):
                                    if f"extra_{self.raw_rects.index(r)}" == key:
                                        rect = r
                                        break
                        
                        if not rect:
                            continue
                            
                        w, h = rect["width"], rect["height"]
                        x, y = rect["x"], rect["y"]
                        
                        from PIL import ImageDraw
                        bg_config = action.get("background")
                        if bg_config:
                            if bg_config.get("type") == "solid":
                                bg_color = bg_config.get("color", "#0f172a")
                                draw_bg = Image.new("RGB", (w, h), bg_color)
                                screen.paste(draw_bg, (x, y))
                            elif bg_config.get("type") == "gradient":
                                color1 = bg_config.get("color1", "#0f172a")
                                color2 = bg_config.get("color2", "#1e293b")
                                draw_bg = Image.new("RGB", (w, h), color1)
                                try:
                                    r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
                                    r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
                                    bg_draw = ImageDraw.Draw(draw_bg)
                                    for y_grad in range(h):
                                        r = int(r1 + (r2 - r1) * y_grad / h)
                                        g = int(g1 + (g2 - g1) * y_grad / h)
                                        b = int(b1 + (b2 - b1) * y_grad / h)
                                        bg_draw.line([(0, y_grad), (w, y_grad)], fill=(r,g,b))
                                except:
                                    pass
                                screen.paste(draw_bg, (x, y))
                        
                        if action.get("type") in ("clock", "widget"):
                            import time
                            import psutil
                            from PIL import ImageDraw, ImageFont
                            
                            payload = action.get("payload", {})
                            if not isinstance(payload, dict) or action.get("type") == "clock":
                                payload = {
                                    "background": {"type": "solid", "color": "#0f172a"},
                                    "elements": [
                                        {"type": "text", "content": "{time}", "x": 50, "y": 40, "fontSize": int(h*0.4), "color": "#f8fafc", "align": "center"},
                                        {"type": "text", "content": "{date}", "x": 50, "y": 75, "fontSize": int(h*0.15), "color": "#94a3b8", "align": "center"}
                                    ]
                                }
                                
                            bg_config = payload.get("background", {"type": "solid", "color": "#0f172a"})
                            if bg_config.get("type") == "gradient":
                                color1 = bg_config.get("color1", "#0f172a")
                                color2 = bg_config.get("color2", "#1e293b")
                                icon = Image.new('RGB', (w, h), color=color1)
                                draw = ImageDraw.Draw(icon)
                                try:
                                    r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
                                    r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
                                    for y_grad in range(h):
                                        r = int(r1 + (r2 - r1) * y_grad / h)
                                        g = int(g1 + (g2 - g1) * y_grad / h)
                                        b = int(b1 + (b2 - b1) * y_grad / h)
                                        draw.line([(0, y_grad), (w, y_grad)], fill=(r,g,b))
                                except:
                                    pass
                            else:
                                icon = Image.new('RGB', (w, h), color=bg_config.get("color", "#0f172a"))
                                
                            draw = ImageDraw.Draw(icon)
                            
                            for el in payload.get("elements", []):
                                if el.get("type") == "text":
                                    content = el.get("content", "")
                                    if "{time}" in content: content = content.replace("{time}", time.strftime("%H:%M"))
                                    if "{date}" in content: content = content.replace("{date}", time.strftime("%d %b"))
                                    if "{cpu}" in content: content = content.replace("{cpu}", str(int(psutil.cpu_percent(interval=None))))
                                    if "{ram}" in content: content = content.replace("{ram}", str(int(psutil.virtual_memory().percent)))
                                    
                                    f_size = el.get("fontSize", 20)
                                    try:
                                        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", int(f_size))
                                    except:
                                        font = ImageFont.load_default()
                                        
                                    abs_x = w * (el.get("x", 50) / 100.0)
                                    abs_y = h * (el.get("y", 50) / 100.0)
                                    
                                    align = el.get("align", "center")
                                    anchor = "mm"
                                    if align == "left": anchor = "lm"
                                    elif align == "right": anchor = "rm"
                                    
                                    draw.text((abs_x, abs_y), content, fill=el.get("color", "#ffffff"), anchor=anchor, font=font)
                            
                            screen.paste(icon, (x, y))
                            continue
                            
                        img_path = action.get("image")
                        if not img_path:
                            continue
                            
                        cache_key = (img_path, w, h)
                        
                        # Use cached processed image if available
                        if cache_key in self.image_cache:
                            cached = self.image_cache[cache_key]
                            if cached["type"] == "anim":
                                frames = cached["frames"]
                                durations = cached["durations"]
                                self.animated_elements.append({
                                    "frames": frames,
                                    "durations": durations,
                                    "x": x,
                                    "y": y,
                                    "current_frame": 0,
                                    "next_update": time.time() + durations[0]
                                })
                                screen.paste(frames[0], (x, y))
                            else:
                                screen.paste(cached["image"], (x, y))
                            continue
                            
                        icon = None
                        
                        import urllib.parse
                        if img_path.startswith('/api/app_icon?app_path='):
                            app_path = urllib.parse.unquote(img_path.split('app_path=')[1])
                            icon_bytes = get_mac_app_icon_bytes(app_path)
                            if icon_bytes:
                                icon = Image.open(io.BytesIO(icon_bytes))
                        elif img_path.startswith('/static/uploads/'):
                            full_path = os.path.abspath(img_path.lstrip('/'))
                            if os.path.exists(full_path):
                                icon = Image.open(full_path)
                        elif os.path.exists(img_path):
                            icon = Image.open(img_path)
                            
                        if icon:
                            from PIL import ImageOps
                            is_animated = getattr(icon, "is_animated", False)
                            
                            if is_animated:
                                frames = []
                                durations = []
                                for frame_idx in range(icon.n_frames):
                                    icon.seek(frame_idx)
                                    frame_img = icon.convert('RGB')
                                    frame_img = ImageOps.fit(frame_img, (w, h), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
                                    frames.append(frame_img)
                                    raw_duration = icon.info.get('duration', 100)
                                    if raw_duration <= 20:
                                        raw_duration = 100
                                    durations.append(raw_duration / 1000.0) # ms to sec
                                
                                # Save to asset cache
                                if len(self.image_cache) > 100: self.image_cache.clear()
                                self.image_cache[cache_key] = {"type": "anim", "frames": frames, "durations": durations}
                                
                                self.animated_elements.append({
                                    "frames": frames,
                                    "durations": durations,
                                    "x": x,
                                    "y": y,
                                    "current_frame": 0,
                                    "next_update": time.time() + durations[0]
                                })
                                # Paste first frame to static background just in case
                                screen.paste(frames[0], (x, y))
                            else:
                                icon = icon.convert('RGB')
                                icon = ImageOps.fit(icon, (w, h), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
                                
                                # Save to asset cache
                                if len(self.image_cache) > 100: self.image_cache.clear()
                                self.image_cache[cache_key] = {"type": "static", "image": icon}
                                
                                screen.paste(icon, (x, y))
                            
                    except Exception as e:
                        logger.error(f"Failed to render icon for {key}: {e}")
                
                self.static_background = screen.copy()
                self.page_cache.clear()
                self._update_composite()
                self.send_jpg_frame() # Kickstart transmission for static screens
                logger.info("Screen rendered and cached successfully.")
                
            except Exception as e:
                logger.error(f"Error rendering screen: {e}")

    def _update_composite(self):
        if not self.static_background:
            return
            
        # Unique identifier for the current state of all animations
        state_key = tuple(anim["current_frame"] for anim in self.animated_elements)
        
        if state_key in self.page_cache:
            self.cached_jpg = self.page_cache[state_key]
            return
            
        screen = self.static_background.copy()
        for anim in self.animated_elements:
            screen.paste(anim["frames"][anim["current_frame"]], (anim["x"], anim["y"]))
            
        if HAS_SIMPLEJPEG:
            self.cached_jpg = simplejpeg.encode_jpeg(np.array(screen), quality=85, colorspace='RGB', fastdct=True)
        else:
            buf = io.BytesIO()
            screen.save(buf, format='JPEG', quality=85)
            self.cached_jpg = buf.getvalue()
            
        # Protect RAM: cache up to 1000 unique frame combinations (aprox 40-50 MB)
        if len(self.page_cache) < 1000:
            self.page_cache[state_key] = self.cached_jpg

    def _animation_loop(self):
        last_render = time.time()
        while self.running:
            needs_update = False
            now = time.time()
            
            with self.animation_lock:
                for anim in self.animated_elements:
                    if now >= anim["next_update"]:
                        # Catch up: skip frames if we are severely behind
                        frames_advanced = 0
                        while now >= anim["next_update"] and frames_advanced < len(anim["frames"]):
                            anim["current_frame"] = (anim["current_frame"] + 1) % len(anim["frames"])
                            anim["next_update"] += anim["durations"][anim["current_frame"]]
                            frames_advanced += 1
                            
                        # If we still fell behind (e.g. system suspended), reset clock
                        if now >= anim["next_update"]:
                            anim["next_update"] = now + anim["durations"][anim["current_frame"]]
                            
                        needs_update = True
                        
                if needs_update:
                    self.pending_render = True
                        
                # Push frames strictly at animation FPS, capped at ~40fps to save CPU
                if getattr(self, 'pending_render', False) and (now - last_render) >= 0.025:
                    self._update_composite()
                    self.send_jpg_frame()
                    self.pending_render = False
                    last_render = time.time()
                    
            time.sleep(0.01) # 100Hz check rate for precise timing

    def send_jpg_frame(self):
        """Sends the current cached JPG to kickstart the video stream."""
        if self.cached_jpg and self.serial_port and self.serial_port.is_open:
            new_id = self._get_next_id()
            pkt = pack_jpg(self.cached_jpg, new_id)
            self.serial_port.write(pkt)

    def _read_loop(self):
        while self.running and self.serial_port and self.serial_port.is_open:
            try:
                data = self.serial_port.read(4096)
                if data:
                    for pkt_id, cmd, payload in self.parser.parse(data):
                        self._handle_packet(pkt_id, cmd, payload)
            except Exception as e:
                logger.error(f"Read loop error: {e}")
                break
        self.disconnect()

    def _handle_packet(self, pkt_id: int, cmd: int, payload: bytes):
        if cmd == CmdValue.SHOW_JPG:
            pass # We use a push architecture now, so we ignore the hardware pull requests
        elif cmd == CmdValue.JSON:
            try:
                data_dict = json.loads(payload.decode('utf-8'))
                self._handle_json(data_dict)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON: {payload}")
                
    def _handle_json(self, data: dict):
        logger.debug(f"Received JSON: {data}")
        # Handle responses to our commands
        if "ack_method" in data:
            if data["ack_method"] == "getInfo" and data.get("success"):
                res = data.get("result", {})
                self.device_model = res.get("deviceModel", self.device_model)
                self.device_width = res.get("deviceWidth", self.device_width)
                self.device_height = res.get("deviceHeight", self.device_height)
                
                # Extract physical button layout
                panel = res.get("devicePanel", {})
                self.raw_rects = panel.get("rects", [])
                self.button_rects.clear()
                for r in self.raw_rects:
                    if r.get("isKey"):
                        c = r.get("col", -1)
                        row = r.get("row", -1)
                        if c >= 0 and row >= 0:
                            self.button_rects[(c, row)] = r
                            
                logger.info(f"Connected to {self.device_model} ({self.device_width}x{self.device_height}) with {len(self.button_rects)} buttons and {len(self.raw_rects)-len(self.button_rects)} extra displays.")
                if self.on_connected:
                    self.on_connected(self.port_name)
                
        # Handle events from device
        if "method" in data and data["method"] == "keyStateChanged":
            params = data.get("parameters", {})
            col = params.get("col", 0)
            row = params.get("row", 0)
            pressed = params.get("pressed", False)
            logger.debug(f"Key event: col={col}, row={row}, pressed={pressed}")
            if self.on_key_state_changed:
                self.on_key_state_changed(self.port_name, col, row, pressed)
