import os
import time
import psutil
from PIL import Image, ImageDraw, ImageFont

def render_action(action, width, height, image_cache=None):
    """
    Renders a single button/action given its JSON payload and dimensions.
    Returns a PIL Image object (RGB).
    """
    if not isinstance(action, dict):
        action = {}
        
    # 1. Background
    bg_config = action.get("background")
    if bg_config:
        if bg_config.get("type") == "solid":
            bg_color = bg_config.get("color", "#0f172a")
            icon = Image.new("RGB", (width, height), bg_color)
        elif bg_config.get("type") == "gradient":
            color1 = bg_config.get("color1", "#0f172a")
            color2 = bg_config.get("color2", "#1e293b")
            icon = Image.new("RGB", (width, height), color1)
            try:
                r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
                r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
                bg_draw = ImageDraw.Draw(icon)
                for y_grad in range(height):
                    r = int(r1 + (r2 - r1) * y_grad / height)
                    g = int(g1 + (g2 - g1) * y_grad / height)
                    b = int(b1 + (b2 - b1) * y_grad / height)
                    bg_draw.line([(0, y_grad), (width, y_grad)], fill=(r,g,b))
            except:
                pass
        else:
            icon = Image.new("RGB", (width, height), "#0f172a")
    else:
        # Default transparent (or black if RGB)
        icon = Image.new("RGB", (width, height), (0,0,0))

    # 2. Base Image (if any)
    img_path = action.get("image")
    if img_path:
        # Load image
        try:
            cache_key = (img_path, width, height)
            if image_cache is not None and cache_key in image_cache:
                cached = image_cache[cache_key]
                if cached["type"] == "static":
                    img_to_paste = cached["image"]
                    if img_to_paste.mode == 'RGBA':
                        icon.paste(img_to_paste, (0, 0), mask=img_to_paste)
                    else:
                        icon.paste(img_to_paste, (0, 0))
            else:
                import urllib.parse
                import io
                icon_to_load = None
                if img_path.startswith('/api/app_icon?app_path='):
                    app_path = urllib.parse.unquote(img_path.split('app_path=')[1])
                    try:
                        from icon_extractor import get_mac_app_icon_bytes
                        icon_bytes = get_mac_app_icon_bytes(app_path)
                        if icon_bytes:
                            icon_to_load = Image.open(io.BytesIO(icon_bytes))
                    except:
                        pass
                elif img_path.startswith('/static/uploads/'):
                    full_path = os.path.abspath(img_path.lstrip('/'))
                    if os.path.exists(full_path):
                        icon_to_load = Image.open(full_path)
                elif os.path.exists(img_path):
                    icon_to_load = Image.open(img_path)

                if icon_to_load:
                    is_gif = img_path.endswith('.gif')
                    if is_gif:
                        try: icon_to_load.seek(0)
                        except: pass
                        
                    img = icon_to_load.resize((width, height), Image.Resampling.LANCZOS)
                    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                        img = img.convert("RGBA")
                        icon.paste(img, (0, 0), mask=img)
                        if image_cache is not None:
                            image_cache[cache_key] = {"type": "static", "image": img}
                    else:
                        img = img.convert("RGB")
                        icon.paste(img, (0, 0))
                        if image_cache is not None:
                            image_cache[cache_key] = {"type": "static", "image": img}
                            
                    if is_gif and action.get("type") not in ("clock", "widget"):
                        draw = ImageDraw.Draw(icon)
                        bw, bh = 30, 16
                        draw.rectangle([(width-bw, height-bh), (width, height)], fill="#ef4444")
                        try: font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "fonts", "Outfit.ttf"), 10)
                        except: font = ImageFont.load_default()
                        draw.text((width - bw/2, height - bh/2), "GIF", fill="white", anchor="mm", font=font)
        except Exception as e:
            pass

    # 3. Widget elements
    if action.get("type") in ("clock", "widget"):
        payload = action.get("payload", {})
        if not isinstance(payload, dict) or action.get("type") == "clock":
            payload = {
                "elements": [
                    {"type": "text", "content": "{time}", "x": 50, "y": 40, "fontSize": 40, "color": "#f8fafc", "align": "center", "fontFamily": "Outfit"},
                    {"type": "text", "content": "{date}", "x": 50, "y": 75, "fontSize": 15, "color": "#94a3b8", "align": "center", "fontFamily": "Outfit"}
                ]
            }
            
        draw = ImageDraw.Draw(icon)
        for el in payload.get("elements", []):
            if el.get("type") == "text":
                content = str(el.get("content", ""))
                if "{time}" in content: content = content.replace("{time}", time.strftime("%H:%M"))
                if "{date}" in content: content = content.replace("{date}", time.strftime("%d %b"))
                if "{cpu}" in content: content = content.replace("{cpu}", str(int(psutil.cpu_percent(interval=None))))
                if "{ram}" in content: content = content.replace("{ram}", str(int(psutil.virtual_memory().percent)))
                
                # Relative Font Size
                f_size_pct = el.get("fontSize", 20)
                f_size_px = int(height * (f_size_pct / 100.0))
                
                font_family = el.get("fontFamily", "Outfit")
                font_path = os.path.join(os.path.dirname(__file__), "fonts", f"{font_family}.ttf")
                try:
                    font = ImageFont.truetype(font_path, f_size_px)
                except:
                    try:
                        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", f_size_px)
                    except:
                        font = ImageFont.load_default()
                    
                abs_x = width * (el.get("x", 50) / 100.0)
                abs_y = height * (el.get("y", 50) / 100.0)
                
                
                align = el.get("align", "center")
                anchor = "mm"
                if align == "left": anchor = "lm"
                elif align == "right": anchor = "rm"
                
                stroke_width = int(el.get("strokeWidth", 0))
                stroke_color = el.get("strokeColor", "#000000")
                shadow_x = int(el.get("shadowX", 0))
                shadow_y = int(el.get("shadowY", 0))
                shadow_color = el.get("shadowColor", "#000000")
                
                if shadow_x != 0 or shadow_y != 0:
                    draw.text((abs_x + shadow_x, abs_y + shadow_y), content, fill=shadow_color, anchor=anchor, font=font, stroke_width=stroke_width, stroke_fill=shadow_color)
                
                draw.text((abs_x, abs_y), content, fill=el.get("color", "#ffffff"), anchor=anchor, font=font, stroke_width=stroke_width, stroke_fill=stroke_color)

            elif el.get("type") == "analog_clock":
                import math
                abs_x = int(width * (el.get("x", 50) / 100.0))
                abs_y = int(height * (el.get("y", 50) / 100.0))
                radius = int(height * (el.get("fontSize", 40) / 100.0))
                color = el.get("color", "#ffffff")
                
                t = time.localtime()
                h, m, s = t.tm_hour, t.tm_min, t.tm_sec
                
                draw.ellipse([abs_x - radius, abs_y - radius, abs_x + radius, abs_y + radius], outline=color, width=2)
                
                h_angle = math.radians((h % 12 + m / 60) * 30 - 90)
                hx = abs_x + radius * 0.5 * math.cos(h_angle)
                hy = abs_y + radius * 0.5 * math.sin(h_angle)
                draw.line([(abs_x, abs_y), (hx, hy)], fill=color, width=4)
                
                m_angle = math.radians(m * 6 - 90)
                mx = abs_x + radius * 0.75 * math.cos(m_angle)
                my = abs_y + radius * 0.75 * math.sin(m_angle)
                draw.line([(abs_x, abs_y), (mx, my)], fill=color, width=2)
                
            elif el.get("type") in ("cpu_gauge", "ram_gauge"):
                abs_x = int(width * (el.get("x", 50) / 100.0))
                abs_y = int(height * (el.get("y", 50) / 100.0))
                radius = int(height * (el.get("fontSize", 30) / 100.0))
                color = el.get("color", "#ef4444")
                stroke = int(el.get("strokeWidth", 8))
                
                if el.get("type") == "cpu_gauge":
                    pct = psutil.cpu_percent(interval=None)
                else:
                    pct = psutil.virtual_memory().percent
                    
                draw.arc([abs_x - radius, abs_y - radius, abs_x + radius, abs_y + radius], start=135, end=405, fill="#334155", width=stroke)
                
                if pct > 0:
                    end_angle = 135 + (270 * (pct / 100.0))
                    draw.arc([abs_x - radius, abs_y - radius, abs_x + radius, abs_y + radius], start=135, end=end_angle, fill=color, width=stroke)
                
                font_path = os.path.join(os.path.dirname(__file__), "fonts", el.get("fontFamily", "Outfit") + ".ttf")
                try: font = ImageFont.truetype(font_path, int(radius * 0.6))
                except: font = ImageFont.load_default()
                draw.text((abs_x, abs_y), f"{int(pct)}%", fill=color, anchor="mm", font=font)

                
    return icon
