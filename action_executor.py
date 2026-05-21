import json
import os
import subprocess
import logging
import subprocess
import logging
import time
import threading

logger = logging.getLogger("ActionExecutor")

CONFIG_FILE = "config.json"

class ActionExecutor:
    def __init__(self):
        self.config = {}
        self.load_config()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    self.config = json.load(f)
            except Exception as e:
                logger.error(f"Error loading config: {e}")
                self.config = {}
        else:
            self.config = {}

    def save_config(self):
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self.config, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving config: {e}")

    def _execute_single_action(self, action_type, payload):
        if action_type == "open_app":
            subprocess.Popen(["open", "-a", payload])
        elif action_type == "hotkey":
            parts = [p.strip().lower() for p in str(payload).split('+')]
            key = parts[-1]
            mac_mods = []
            for m in parts[:-1]:
                if m in ('command', 'cmd'): mac_mods.append("command down")
                elif m == 'shift': mac_mods.append("shift down")
                elif m in ('option', 'alt'): mac_mods.append("option down")
                elif m in ('control', 'ctrl'): mac_mods.append("control down")
            
            mod_str = "using {" + ", ".join(mac_mods) + "}" if mac_mods else ""
            special_keys = {
                'enter': 36, 'return': 36, 'space': 49, 'tab': 48,
                'delete': 51, 'backspace': 51, 'esc': 53, 'escape': 53,
                'up': 126, 'down': 125, 'left': 123, 'right': 124
            }
            if key in special_keys:
                subprocess.Popen(['osascript', '-e', f'tell application "System Events" to key code {special_keys[key]} {mod_str}'])
            else:
                subprocess.Popen(['osascript', '-e', f'tell application "System Events" to keystroke "{key}" {mod_str}'])
                
        elif action_type == "text":
            text = str(payload).replace('"', '\\"').replace("'", "\\'")
            subprocess.Popen(['osascript', '-e', f'tell application "System Events" to keystroke "{text}"'])
            
        elif action_type == "media":
            if payload == "volumemute":
                subprocess.Popen(['osascript', '-e', 'set volume output muted not (output muted of (get volume settings))'])
            elif payload == "volumeup":
                subprocess.Popen(['osascript', '-e', 'set volume output volume ((output volume of (get volume settings)) + 5)'])
            elif payload == "volumedown":
                subprocess.Popen(['osascript', '-e', 'set volume output volume ((output volume of (get volume settings)) - 5)'])
            elif payload == "playpause":
                subprocess.Popen(['osascript', '-e', 'tell application "System Events" to key code 100'])
            elif payload == "nexttrack":
                subprocess.Popen(['osascript', '-e', 'tell application "System Events" to key code 101'])
            elif payload == "prevtrack":
                subprocess.Popen(['osascript', '-e', 'tell application "System Events" to key code 98'])
                
        elif action_type == "shell":
            subprocess.Popen(payload, shell=True)
        elif action_type == "delay":
            time.sleep(float(payload) / 1000.0)
        else:
            logger.warning(f"Unknown action type: {action_type}")

    def _run_macro(self, actions_list):
        for act in actions_list:
            act_type = act.get("type")
            pl = act.get("payload")
            try:
                self._execute_single_action(act_type, pl)
            except Exception as e:
                logger.error(f"Macro step failed {act_type}: {e}")

    def execute(self, key: str, page_config: dict):
        """Executes the action configured for the given key string (e.g. '0_0')."""
        action = page_config.get(key)
        if not action:
            logger.info(f"No action configured for {key}")
            return
            
        action_type = action.get("type")
        payload = action.get("payload")
        
        try:
            if action_type == "multi_action":
                if isinstance(payload, list):
                    threading.Thread(target=self._run_macro, args=(payload,), daemon=True).start()
            else:
                self._execute_single_action(action_type, payload)
        except Exception as e:
            logger.error(f"Failed to execute action {action_type}: {e}")

    def set_action(self, col: int, row: int, action_type: str, payload, image_path: str = ""):
        key_id = f"{col}_{row}"
        
        # Clean image path
        image_path = image_path.strip().strip("'").strip('"')
        
        self.config[key_id] = {
            "type": action_type,
            "payload": payload,
            "image": image_path
        }
        self.save_config()
