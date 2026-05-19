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
        
        # Callbacks
        self.on_key_pressed: Optional[Callable[[int, int], None]] = None
        self.on_key_state_changed: Callable[[int, int, bool], None] = None
        self.on_connected: Optional[Callable[[], None]] = None
        self.on_disconnected: Callable[[], None] = None
        
        self.device_model = "Unknown"
        self.device_width = 1024 # Default guess, will update on getInfo
        self.device_height = 600
        self.button_rects = {}
        self.raw_rects = []
        
        self.cached_jpg = None
        self.config = {}
        self.current_page = "main"

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
            
            # Request info
            self.send_json({"method": "getInfo"})
            
            if self.on_connected:
                self.on_connected()
                
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.port_name}: {e}")
            return False

    def disconnect(self):
        self.running = False
        if self.read_thread:
            self.read_thread.join(timeout=1.0)
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        if self.on_disconnected:
            self.on_disconnected()

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
        """Composites all elements onto a single fullscreen image and caches the JPEG."""
        try:
            self.config = config
            # Create a black background
            screen = Image.new('RGB', (self.device_width, self.device_height), color=(0, 0, 0))
            
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
                                # we need a way to map them. Let's assume frontend sets key as "extra_{index}"
                                # but for now let's just find by exact index if possible
                                if f"extra_{self.raw_rects.index(r)}" == key:
                                    rect = r
                                    break
                    
                    if not rect:
                        continue
                        
                    w, h = rect["width"], rect["height"]
                    x, y = rect["x"], rect["y"]
                    
                    img_path = action["image"]
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
                        icon = icon.convert('RGB')
                        # Exact size of the transparent window, with center crop to preserve aspect ratio
                        from PIL import ImageOps
                        icon = ImageOps.fit(icon, (w, h), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
                        screen.paste(icon, (x, y))
                        
                except Exception as e:
                    logger.error(f"Failed to render icon for {key}: {e}")
            
            buf = io.BytesIO()
            screen.save(buf, format='JPEG', quality=95)
            self.cached_jpg = buf.getvalue()
            logger.info("Screen rendered and cached successfully.")
            
            # Iniciar inmediatamente el envío del frame al dispositivo
            self.send_jpg_frame()
        except Exception as e:
            logger.error(f"Error rendering screen: {e}")

    def send_jpg_frame(self):
        """Sends the current cached JPG to kickstart the video stream."""
        if self.cached_jpg and self.serial_port and self.serial_port.is_open:
            new_id = self._get_next_id()
            logger.debug(f"Sending JPG frame (size {len(self.cached_jpg)}) with new id {new_id}")
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
            logger.debug(f"Received SHOW_JPG request with id {pkt_id}")
            if self.cached_jpg and self.serial_port and self.serial_port.is_open:
                new_id = self._get_next_id()
                logger.debug(f"Sending JPG frame (size {len(self.cached_jpg)}) with new id {new_id}")
                pkt = pack_jpg(self.cached_jpg, new_id)
                self.serial_port.write(pkt)
            else:
                logger.debug("Ignored SHOW_JPG (cached_jpg is None or port closed).")
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
                    self.on_connected()
                
        # Handle events from device
        if "method" in data and data["method"] == "keyStateChanged":
            params = data.get("parameters", {})
            col = params.get("col", 0)
            row = params.get("row", 0)
            pressed = params.get("pressed", False)
            logger.debug(f"Key event: col={col}, row={row}, pressed={pressed}")
            if self.on_key_state_changed:
                self.on_key_state_changed(col, row, pressed)
