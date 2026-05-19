import serial
import serial.tools.list_ports
import threading
import time
import json
import logging
from PIL import Image
import io
from typing import Callable, Optional

from waveshare_protocol import pack_json, pack_jpg, StreamDeckParser, CmdValue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WaveshareController")

class WaveshareController:
    def __init__(self, port_name: Optional[str] = None):
        self.port_name = port_name
        self.serial_port = None
        self.parser = StreamDeckParser()
        self.packet_id = 1
        
        self.running = False
        self.read_thread = None
        
        # Callbacks
        self.on_key_state_changed: Callable[[int, int, bool], None] = None
        self.on_connected: Callable[[], None] = None
        self.on_disconnected: Callable[[], None] = None
        
        self.device_model = "Unknown"
        self.device_width = 120
        self.device_height = 120

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

    def send_image(self, image_path: str, col: int, row: int):
        """Load an image, resize it to fit one button, and send it."""
        try:
            with Image.open(image_path) as img:
                # The hardware expects images to be rendered to specific screen coordinates.
                # In the original demo, they just take a screenshot of a specific widget region.
                # Usually, stream decks have individual screens per button, or one big screen where we draw at specific x, y.
                # Assuming one big screen for now, we'd need the exact screen layout if it's a single screen.
                # Wait, the demo sends CMD_VALUE_SHOW_JPG with a FULL screen snapshot. 
                # "jpgData = captureRegionToJpegByteArray(QRect(x, y, property("deviceWidth"), property("deviceHeight")))"
                # This means it sends ONE large JPEG for the entire screen, not per button!
                
                # We should resize the image to exactly device_width x device_height
                img = img.convert('RGB')
                if img.size != (self.device_width, self.device_height):
                    img = img.resize((self.device_width, self.device_height), Image.Resampling.LANCZOS)
                
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=95)
                jpg_data = buf.getvalue()
                
                pkt = pack_jpg(jpg_data, self._get_next_id())
                if self.serial_port and self.serial_port.is_open:
                    self.serial_port.write(pkt)
        except Exception as e:
            logger.error(f"Error sending image {image_path}: {e}")

    def send_full_screen_image_data(self, img: Image.Image):
        """Sends an already composited full screen image."""
        try:
            img = img.convert('RGB')
            if img.size != (self.device_width, self.device_height):
                img = img.resize((self.device_width, self.device_height), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=95)
            jpg_data = buf.getvalue()
            
            pkt = pack_jpg(jpg_data, self._get_next_id())
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.write(pkt)
        except Exception as e:
            logger.error(f"Error sending composited image: {e}")

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
        if cmd == CmdValue.JSON:
            try:
                data_dict = json.loads(payload.decode('utf-8'))
                self._handle_json(data_dict)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON: {payload}")
                
    def _handle_json(self, data: dict):
        # Handle responses to our commands
        if "ack_method" in data:
            if data["ack_method"] == "getInfo" and data.get("success"):
                res = data.get("result", {})
                self.device_model = res.get("deviceModel", self.device_model)
                self.device_width = res.get("deviceWidth", self.device_width)
                self.device_height = res.get("deviceHeight", self.device_height)
                logger.info(f"Connected to {self.device_model} ({self.device_width}x{self.device_height})")
                
        # Handle events from device
        if "method" in data and data["method"] == "keyStateChanged":
            params = data.get("parameters", {})
            col = params.get("col", 0)
            row = params.get("row", 0)
            pressed = params.get("pressed", False)
            logger.debug(f"Key event: col={col}, row={row}, pressed={pressed}")
            if self.on_key_state_changed:
                self.on_key_state_changed(col, row, pressed)
