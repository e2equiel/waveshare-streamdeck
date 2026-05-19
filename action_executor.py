import json
import os
import subprocess
import logging
import pyautogui

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

    def execute(self, col: int, row: int):
        """Execute the action mapped to the specific column and row."""
        key_id = f"{col}_{row}"
        action_def = self.config.get(key_id)
        
        if not action_def:
            logger.debug(f"No action configured for {key_id}")
            return
            
        action_type = action_def.get("type")
        payload = action_def.get("payload")
        
        try:
            if action_type == "open_app":
                subprocess.Popen(["open", "-a", payload])
            elif action_type == "hotkey":
                # payload could be a list like ["command", "shift", "m"]
                if isinstance(payload, list):
                    pyautogui.hotkey(*payload)
                else:
                    pyautogui.press(payload)
            elif action_type == "shell":
                subprocess.Popen(payload, shell=True)
            else:
                logger.warning(f"Unknown action type: {action_type}")
        except Exception as e:
            logger.error(f"Failed to execute action {action_type}: {e}")

    def set_action(self, col: int, row: int, action_type: str, payload, image_path: str = ""):
        key_id = f"{col}_{row}"
        self.config[key_id] = {
            "type": action_type,
            "payload": payload,
            "image": image_path
        }
        self.save_config()
