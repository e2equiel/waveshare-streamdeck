import time
import logging
from waveshare_controller import WaveshareController

# Configurar logging para ver la respuesta del teclado en la consola
logging.basicConfig(level=logging.DEBUG, format='%(message)s')

def main():
    print("Conectando al teclado para verificar estado del Wi-Fi...")
    controller = WaveshareController()
    
    if controller.connect():
        print("¡Conectado! Pidiendo estado de red...")
        
        # Le enviamos el comando para obtener el estado de la red.
        # Basado en los strings del binario, probamos un par de variantes posibles:
        status_payload1 = {
            "action": "getDeviceNetworkState"
        }
        status_payload2 = {
            "action": "getNetworkStatus"
        }
        
        controller.send_json(status_payload1)
        time.sleep(1)
        controller.send_json(status_payload2)
        
        print("Esperando respuestas (deberían aparecer arriba)...")
        time.sleep(4)
        
        try:
            controller.disconnect()
        except Exception:
            pass
        print("Desconectado.")
    else:
        print("Error: No se pudo conectar al teclado.")

if __name__ == "__main__":
    main()
