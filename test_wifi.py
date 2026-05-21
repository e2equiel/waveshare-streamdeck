import time
from waveshare_controller import WaveshareController

def main():
    print("Conectando al teclado...")
    controller = WaveshareController()
    
    if controller.connect():
        print("¡Conectado exitosamente!")
        
        ssid = "Skynet II"
        password = "pindonga321"
        
        print(f"Enviando credenciales para la red: {ssid}")
        
        wifi_payload = {
            "action": "SetUp NetNetwork",
            "wifissid": ssid,
            "wifipsk": password
        }
        
        try:
            controller.send_json(wifi_payload)
            print("JSON enviado. Esperando 2 segundos para ver respuesta...")
            time.sleep(2)
            try:
                controller.disconnect()
            except RuntimeError:
                pass
            print("Desconectado.")
        except Exception as e:
            print(f"Nota: El teclado cerró la conexión (probablemente se está reiniciando para conectar al Wi-Fi).")
    else:
        print("Error: No se pudo conectar al teclado.")

if __name__ == "__main__":
    main()
