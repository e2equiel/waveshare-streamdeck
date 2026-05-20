# Project Context: Waveshare Stream Deck Controller

**Objective:** This repository contains a complete, native Python re-implementation of the control software for the "Waveshare Stream Deck", originally designed only for Windows using a Qt C++ application. It now features a Python backend architecture and a web frontend, highly optimized for native integration with macOS.

## Architecture

- **Hardware Engine (`waveshare_controller.py` & `waveshare_protocol.py`):**
  - Implements the Waveshare binary serial protocol, including CRC32 calculation (Poly `0x04C11DB7`) and packet framing (`A1 A5 5A 5E`).
  - Listens to a CDC Serial endpoint (`/dev/cu.usbmodem...`) asynchronously via threads.
  - Generates full-screen JPEG frames (`CMD_VALUE_SHOW_JPG`). It dynamically reads the physical button layout from the initialization command (`getInfo`), ensuring precise framing without overlap on the transparent button windows.
  - **Animated GIFs & Push Architecture:** Implements a strict "Push" Variable Refresh Rate (VRR) architecture. It ignores device-initiated `SHOW_JPG` pull requests to avoid USB saturation and instead pushes frames exactly at the animation's clock frequency.
  - **Hardware Acceleration:** Uses `simplejpeg` (SIMD NEON/SSE) on top of Numpy arrays to encode JPEGs in < 1ms, slashing CPU usage to near 0%.
  - **In-Memory Caching:** Uses `page_cache` to store pre-rendered, pre-compressed JPEG frames for current animation states, effectively dropping rendering overhead to 0% after the first loop. It also uses `image_cache` to keep scaled origin images in RAM.

- **Web Server (`server.py`):**
  - Built with **FastAPI**.
  - Supports **Multi-Device**: Manages multiple controllers simultaneously via a `device_id` dictionary.
  - Exposes endpoints for the frontend (`/api/config`, `/api/apps`, `/api/extract_app_icon`, `/api/upload_base64`, `/api/upload_file`, `/api/layout`).
  - Uses **`sips`** (native macOS tool) via `subprocess` to extract embedded Mac app icons (`.icns` to `.png`), permanently hashing and saving them to `static/uploads/` so the config does not depend on the user's local filesystem paths.

- **Action Executor (`action_executor.py`):**
  - Handles keyboard macros using `pyautogui` and executes scripts/commands via `subprocess`.

- **Frontend (`static/index.html`, `app.js`, `style.css`):**
  - Interactive WYSIWYG UI to assign images and commands to each layout element.
  - Implements a dynamic application menu reading from `/Applications`.
  - Integrates **Cropper.js** for advanced image cropping via Drag & Drop. All uploaded files (Static, GIF, and App Icons) are saved permanently with UUID hashes into the `/static/uploads/` directory to ensure high portability across computers.
  - Implements dynamic device switching.

## Rules and Considerations for Future AI Agents

1. **Protocol:** Do not modify `waveshare_protocol.py` unless strictly necessary. The headers and CRC32 algorithm are highly sensitive and exact.
2. **Animation Engine:** When working on `waveshare_controller.py`, remember that the device firmware is fragile. Never reply synchronously to `SHOW_JPG` pulls; always use the host-driven "Push" loop to guarantee stability and prevent freezing.
3. **Mac Icon Handling:** Never attempt to read an `.icns` natively using the `Pillow` library in this project; always use the `sips` wrapper provided by `get_mac_app_icon_bytes` to guarantee correct conversion to PNG format in a buffer. 
4. **Origin Paths:** Do not store absolute or local file paths in the `config.json`. Ensure any new asset type is piped through an endpoint that saves it to `static/uploads/` with a UUID to preserve configuration portability.
5. **Logs and Performance:** Keep log level at `INFO` or `WARNING`.
6. **Server State:** Properly stop the thread with `.stop()` before releasing resources.
