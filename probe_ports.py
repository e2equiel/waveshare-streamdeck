import socket
import time

def grab_banner(port):
    try:
        print(f"Connecting to port {port}...")
        s = socket.socket()
        s.settimeout(2)
        s.connect(('10.0.0.176', port))
        
        # Try to read banner
        try:
            banner = s.recv(1024)
            if banner:
                print(f"Banner on port {port}: {banner}")
                return
        except:
            pass
            
        # Try to send HTTP
        s.send(b"GET / HTTP/1.0\r\n\r\n")
        try:
            resp = s.recv(1024)
            print(f"HTTP response on port {port}: {resp}")
            return
        except:
            pass

        # Try to send garbage
        s.send(b"HELLO\n")
        try:
            resp = s.recv(1024)
            print(f"Garbage response on port {port}: {resp}")
            return
        except:
            pass

        print(f"No response on port {port}")
    except Exception as e:
        print(f"Port {port} error: {e}")

grab_banner(8888)
grab_banner(8887)
