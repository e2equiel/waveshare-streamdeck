import time
import json
from waveshare_controller import WaveshareController

def main():
    print("Conectando al teclado y manteniendo la conexión abierta...")
    controller = WaveshareController()
    
    # Prevenir que el ESP32 se reinicie al conectar
    if not controller.connect():
        print("Error: No se pudo conectar al teclado.")
        return
        
    time.sleep(2) # Esperar a que se estabilice
    
    ssid = "Skynet II"
    password = "pindonga321"
    
    # Formatos más probables extraídos del código desensamblado
    payloads = [
        {"method": "deviceNetWorkConfig", "parameters": {"wifissid": ssid, "wifipsk": password}},
        {"action": "SetUp NetNetwork", "wifissid": ssid, "wifipsk": password},
        {"method": "SetUp NetNetwork", "wifissid": ssid, "wifipsk": password},
        {"wifissid": ssid, "wifipsk": password} # El formato más crudo
    ]
    
    for i, payload in enumerate(payloads):
        print(f"Enviando Formato {i+1}...")
        controller.send_json(payload)
        
        # Le damos 15 segundos al ESP32 para que intente conectar al Wi-Fi
        print("Esperando 15 segundos para ver si conecta...")
        for _ in range(15):
            time.sleep(1)
            
    print("Prueba terminada. Cerrando conexión.")
    controller.disconnect()

if __name__ == "__main__":
    main()
