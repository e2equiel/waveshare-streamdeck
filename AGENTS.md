# Contexto del Proyecto: Waveshare Stream Deck Controller

**Objetivo:** Este repositorio contiene una re-implementación completa y nativa en Python del software de control para el "Waveshare Stream Deck 10", diseñado originalmente solo para Windows mediante una aplicación Qt C++. Ahora cuenta con una arquitectura de backend en Python y un frontend web, altamente optimizado para integrarse de forma nativa con macOS.

## Arquitectura

- **Motor de Hardware (`waveshare_controller.py` & `waveshare_protocol.py`):**
  - Implementa el protocolo serial binario de Waveshare, incluyendo el cálculo de CRC32 (Poly `0x04C11DB7`) y el framing de paquetes (`A1 A5 5A 5E`).
  - Escucha un endpoint CDC Serial (`/dev/cu.usbmodem...`) de forma asíncrona mediante threads.
  - Genera frames JPEG (`CMD_VALUE_SHOW_JPG`) de la pantalla entera usando `Pillow`. Lee dinámicamente el layout físico de los botones desde el comando de inicialización (`getInfo`), garantizando un encuadre preciso sin solapamiento en las ventanas transparentes de los botones.

- **Servidor Web (`server.py`):**
  - Construido con **FastAPI**.
  - Expone endpoints para el frontend (`/api/config`, `/api/apps`, `/api/app_icon`, `/api/upload_base64`).
  - Utiliza **`sips`** (herramienta nativa de macOS) a través de `subprocess` para extraer con 100% de eficacia los iconos incrustados de las apps de Mac (`.icns` a `.png`), ya que las implementaciones puras de Python fallan en apps modernas o vacías como Calendar.app.

- **Ejecutor de Acciones (`action_executor.py`):**
  - Maneja macros de teclado usando `pyautogui` y ejecución de scripts/comandos vía `subprocess`.

- **Frontend (`static/index.html`, `app.js`, `style.css`):**
  - UI interactiva para asignar imágenes y comandos a cada botón de la cuadrícula.
  - Implementa un menú dinámico de aplicaciones leyendo `/Applications`.
  - Integra **Cropper.js** para recorte avanzado de imágenes vía Drag & Drop, enviándolas en Base64 al servidor.
  - Implementa "cache busting" (`?t=timestamp`) agresivo para evitar fallos de lectura en iconos fallidos anteriores.

## Reglas y Consideraciones para futuros Agentes AI

1. **Protocolo:** No modificar `waveshare_protocol.py` a menos que sea estrictamente necesario. Las cabeceras y el algoritmo CRC32 son muy sensibles y exactos.
2. **Crop de Imágenes:** Se utiliza `ImageOps.fit(..., centering=(0.5, 0.5))` en lugar de `resize` para no distorsionar las imágenes PNG/JPEG cargadas.
3. **Manejo de Íconos de Mac:** Nunca intentar leer un `.icns` nativamente usando la librería `Pillow` en este proyecto, siempre usar el wrapper de `sips` que provee `get_mac_app_icon_bytes` para garantizar su correcta conversión a formato PNG en un buffer.
4. **Logs y Rendimiento:** El dispositivo solicita un frame JPG docenas de veces por segundo (`SHOW_JPG`). Nunca usar log level `DEBUG` de forma generalizada en `waveshare_controller.py`, ya que satura la terminal y ralentiza el motor serial. Mantener log level en `INFO` o `WARNING`.
5. **Estado del Servidor:** Siempre tener en cuenta que las variables y el estado del `serial_port` son persistentes. Detener adecuadamente el hilo con `.stop()` antes de liberar recursos.
