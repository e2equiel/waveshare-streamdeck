import socket
import json
import time

def test_raw_tcp():
    print("Testing Port 8888 with raw JSON...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3.0)
    
    try:
        s.connect(('10.0.0.176', 8888))
        print("Connected!")
        
        payload = json.dumps({"method": "getInfo"})
        s.sendall(payload.encode('utf-8'))
        print(f"Sent: {payload}")
        
        data = s.recv(4096)
        if data:
            print(f"Received {len(data)} bytes: {data}")
        else:
            print("No data received.")
            
        s.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_raw_tcp()
