import time
import json
import base64
from waveshare_controller import WaveshareController

def main():
    print("Conectando al teclado...")
    controller = WaveshareController()
    
    if not controller.connect():
        print("Error: No se pudo conectar al teclado.")
        return
        
    time.sleep(2)
    
    ssid = "Skynet II"
    password = "pindonga321"
    
    # Este es el texto exacto que descubrimos en el binario
    wpa_conf = f"""ctrl_interface=/var/run/wpa_supplicant
update_config=1

network={{
    ssid="{ssid}"
    psk="{password}"
    key_mgmt=WPA-PSK
}}
"""
    
    print("Contenido del archivo a enviar:")
    print(wpa_conf)
    
    # Codificamos a base64 como hace el código original
    data_b64 = base64.b64encode(wpa_conf.encode('utf-8')).decode('utf-8')
    
    # Armamos el comando de guardado de archivo
    save_file_payload = {
        "method": "saveToFile",
        "parameters": {
            "filePath": "/etc/wpa_supplicant.conf",
            "seek": 0,
            "data": data_b64
        }
    }
    
    print("Enviando archivo de configuración directamente al sistema Linux interno...")
    try:
        controller.send_json(save_file_payload)
        time.sleep(2)
    except Exception as e:
        print(f"Error al enviar: {e}")
        
    print("\n¡Archivo enviado!")
    print("Por favor, desconecta el cable USB del teclado y vuélvelo a conectar (para que se reinicie).")
    print("Al prender, el Linux interno debería leer el archivo y conectarse a tu Wi-Fi automáticamente.")
    
    controller.disconnect()

if __name__ == "__main__":
    main()
