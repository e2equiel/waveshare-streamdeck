# Project Context: Waveshare Stream Deck Controller

**Objective:** This repository contains a complete, native Python re-implementation of the control software for the "Waveshare Stream Deck 10", originally designed only for Windows using a Qt C++ application. It now features a Python backend architecture and a web frontend, highly optimized for native integration with macOS.

## Architecture

- **Hardware Engine (`waveshare_controller.py` & `waveshare_protocol.py`):**
  - Implements the Waveshare binary serial protocol, including CRC32 calculation (Poly `0x04C11DB7`) and packet framing (`A1 A5 5A 5E`).
  - Listens to a CDC Serial endpoint (`/dev/cu.usbmodem...`) asynchronously via threads.
  - Generates full-screen JPEG frames (`CMD_VALUE_SHOW_JPG`) using `Pillow`. It dynamically reads the physical button layout from the initialization command (`getInfo`), ensuring precise framing without overlap on the transparent button windows.

- **Web Server (`server.py`):**
  - Built with **FastAPI**.
  - Exposes endpoints for the frontend (`/api/config`, `/api/apps`, `/api/app_icon`, `/api/upload_base64`, `/api/layout`).
  - Uses **`sips`** (native macOS tool) via `subprocess` to extract embedded Mac app icons (`.icns` to `.png`) with 100% reliability, since pure Python implementations fail on modern or empty apps like Calendar.app.

- **Action Executor (`action_executor.py`):**
  - Handles keyboard macros using `pyautogui` and executes scripts/commands via `subprocess`.

- **Frontend (`static/index.html`, `app.js`, `style.css`):**
  - Interactive WYSIWYG UI to assign images and commands to each layout element.
  - Implements a dynamic application menu reading from `/Applications`.
  - Integrates **Cropper.js** for advanced image cropping via Drag & Drop, sending them in Base64 to the server.
  - Implements aggressive cache busting (`?t=timestamp`) to prevent read failures on previously broken icons.

## Rules and Considerations for Future AI Agents

1. **Protocol:** Do not modify `waveshare_protocol.py` unless strictly necessary. The headers and CRC32 algorithm are highly sensitive and exact.
2. **Image Cropping:** Use `ImageOps.fit(..., centering=(0.5, 0.5))` instead of `resize` to avoid distorting loaded PNG/JPEG images.
3. **Mac Icon Handling:** Never attempt to read an `.icns` natively using the `Pillow` library in this project; always use the `sips` wrapper provided by `get_mac_app_icon_bytes` to guarantee correct conversion to PNG format in a buffer.
4. **Logs and Performance:** The device requests a JPG frame dozens of times per second (`SHOW_JPG`). Never use `DEBUG` log level globally in `waveshare_controller.py`, as it saturates the terminal and slows down the serial engine. Keep log level at `INFO` or `WARNING`.
5. **Server State:** Always keep in mind that variables and `serial_port` state are persistent. Properly stop the thread with `.stop()` before releasing resources.
6. **WiFi:** The factory firmware does not support WiFi. It is strictly CDC Serial over USB. Any future WiFi support will require flashing custom firmware to the ESP32.
