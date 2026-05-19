# Waveshare Stream Deck Controller

A custom Python-based controller and web configuration interface for the Waveshare Stream Deck 10 (MK Series Upper Computer).

This project replaces the official Windows-only Qt software with a cross-platform (highly optimized for macOS) solution.

## Features

*   **Native macOS App Integration:** Automatically fetches installed applications from `/Applications`, extracting their native `.icns` icons dynamically using `sips`.
*   **WYSIWYG Web Interface:** Configure your Stream Deck visually. Supports Drag & Drop image cropping via Cropper.js.
*   **Pagination & Folders:** Organize your keys into multiple pages and navigate between them seamlessly.
*   **Custom Protocol Implementation:** Fully reverse-engineered serial binary protocol including CRC32 validation and dynamic screen framing based on hardware-reported dimensions.

## Requirements

*   Python 3.10+
*   macOS (for `sips` native icon extraction, though the core protocol is cross-platform).
*   Dependencies listed in `requirements.txt`.

## Installation

1.  Clone the repository.
2.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Usage

1.  Connect your Waveshare Stream Deck via USB.
2.  Start the server:
    ```bash
    python server.py
    ```
3.  Open your browser at `http://127.0.0.1:8000/static/index.html`.
4.  Use the visual editor to map apps, keyboard macros, or system commands to your physical keys.
5.  Click "Deploy / Save All" to push the configuration to the device.

## Architecture

*   **`server.py`:** FastAPI web server handling UI configuration and API endpoints.
*   **`waveshare_controller.py`:** Core hardware engine. Manages the CDC Serial connection, processes raw packets, and renders the fullscreen UI using Pillow.
*   **`waveshare_protocol.py`:** Low-level packet packing and parsing.
*   **`action_executor.py`:** Executes local macOS commands (like opening apps or triggering key presses via `pyautogui`).
*   **`static/`:** HTML, CSS, and JS for the web interface.
