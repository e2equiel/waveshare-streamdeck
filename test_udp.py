import socket
import time
from waveshare_protocol import pack_json, StreamDeckParser

def test_udp():
    print("Testing UDP Ports...")
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(1.0)
    
    pkt = pack_json({"method": "getInfo"}, packet_id=1)
    
    for port in range(8880, 8900):
        try:
            # Maybe it needs the init buffer first
            s.sendto(b'0' * 1024, ('10.0.0.176', port))
            time.sleep(0.1)
            s.sendto(pkt, ('10.0.0.176', port))
            
            try:
                data, addr = s.recvfrom(4096)
                if data:
                    print(f"!!! Received response from port {port} !!!")
                    print(f"Data: {data}")
                    return
            except socket.timeout:
                pass
        except Exception as e:
            pass

    # Try common ports without init buffer
    for port in [5000, 5001, 8080, 8888, 9000, 12345]:
        s.sendto(pkt, ('10.0.0.176', port))
        try:
            data, addr = s.recvfrom(4096)
            if data:
                print(f"!!! Received response from port {port} !!!")
                print(f"Data: {data}")
                return
        except socket.timeout:
            pass
            
    print("No UDP responses.")
    s.close()

if __name__ == "__main__":
    test_udp()
