import struct
import zlib
import json

FRAME_HEADER = b'\xA1\xA5\x5A\x5E'

class CmdValue:
    SHOW_JPG = 100
    JSON = 101

def calc_crc(data: bytes) -> int:
    """Calculate standard CRC32, ensuring it is an unsigned 32-bit integer."""
    return zlib.crc32(data) & 0xFFFFFFFF

def pack_command(cmd_value: int, data: bytes, packet_id: int) -> bytes:
    """
    Packs a command according to the Waveshare Stream Deck protocol.
    
    Format:
    - Header (4 bytes)
    - ID (4 bytes)
    - CMD (4 bytes)
    - Size (4 bytes)
    - Size CRC32 (4 bytes)
    - Data (variable length)
    - Data CRC32 (4 bytes)
    """
    res = bytearray(FRAME_HEADER)
    
    # ID (uint32 little-endian)
    res.extend(struct.pack('<I', packet_id))
    
    # CMD (uint32 little-endian)
    res.extend(struct.pack('<I', cmd_value))
    
    # SIZE (uint32 little-endian)
    size = len(data)
    size_bytes = struct.pack('<I', size)
    res.extend(size_bytes)
    
    # SIZE CRC (uint32 little-endian)
    size_crc = calc_crc(size_bytes)
    res.extend(struct.pack('<I', size_crc))
    
    # DATA
    res.extend(data)
    
    # DATA CRC (uint32 little-endian)
    data_crc = calc_crc(data)
    res.extend(struct.pack('<I', data_crc))
    
    return bytes(res)

def pack_json(data_dict: dict, packet_id: int) -> bytes:
    """Helper to pack a JSON dictionary."""
    # Convert dict to JSON bytes (compact representation)
    json_str = json.dumps(data_dict, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    return pack_command(CmdValue.JSON, json_bytes, packet_id)

def pack_jpg(jpg_data: bytes, packet_id: int) -> bytes:
    """Helper to pack JPG image data."""
    return pack_command(CmdValue.SHOW_JPG, jpg_data, packet_id)

class StreamDeckParser:
    def __init__(self):
        self.buffer = bytearray()
        self.FRAME_MIN_SIZE = len(FRAME_HEADER) + 16 # header(4) + id(4) + cmd(4) + size(4) + size_crc(4)

    def parse(self, new_data: bytes):
        """
        Parses incoming data and yields valid packets.
        Yields: (packet_id, cmd, data_bytes)
        """
        self.buffer.extend(new_data)
        
        while len(self.buffer) >= self.FRAME_MIN_SIZE:
            # Find header
            idx = self.buffer.find(FRAME_HEADER)
            if idx == -1:
                # No header found, clear buffer
                self.buffer.clear()
                break
            
            if idx > 0:
                # Trim before header
                self.buffer = self.buffer[idx:]
                
            if len(self.buffer) < self.FRAME_MIN_SIZE:
                break
                
            # Unpack metadata
            # header = 0..3
            # id = 4..7
            # cmd = 8..11
            # size = 12..15
            # size_crc = 16..19
            metadata_fmt = '<IIII' # id, cmd, size, size_crc
            packet_id, cmd, size, size_crc = struct.unpack_from(metadata_fmt, self.buffer, 4)
            
            # Verify size CRC
            size_bytes = struct.pack('<I', size)
            if calc_crc(size_bytes) != size_crc:
                # Invalid size CRC, maybe false header match or corrupted. Skip this header.
                self.buffer = self.buffer[4:]
                continue
                
            total_packet_size = self.FRAME_MIN_SIZE + size + 4 # +4 for data_crc
            
            if len(self.buffer) < total_packet_size:
                # Wait for more data
                break
                
            # Extract data and verify data CRC
            data_start = self.FRAME_MIN_SIZE
            data_end = data_start + size
            data = self.buffer[data_start:data_end]
            
            data_crc, = struct.unpack_from('<I', self.buffer, data_end)
            
            if calc_crc(data) == data_crc:
                # Valid packet!
                yield (packet_id, cmd, bytes(data))
                
            # Move buffer forward
            self.buffer = self.buffer[total_packet_size:]
