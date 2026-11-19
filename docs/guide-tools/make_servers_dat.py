# Write a Minecraft servers.dat (uncompressed NBT) with one server entry.
# Usage: python -I make_servers_dat.py <out_file> <name> <address> [icon_png_64x64]
import sys, struct, base64

out, name, addr = sys.argv[1], sys.argv[2], sys.argv[3]
icon = base64.b64encode(open(sys.argv[4], 'rb').read()).decode() if len(sys.argv) > 4 else None

def s(v):  # NBT string payload
    b = v.encode('utf-8'); return struct.pack('>H', len(b)) + b
def tag(t, n, payload):
    return bytes([t]) + s(n) + payload

entry = tag(8, 'name', s(name)) + tag(8, 'ip', s(addr)) + tag(1, 'acceptTextures', b'\x01')
if icon:
    entry += tag(8, 'icon', s(icon))
entry += b'\x00'  # end of server compound
servers = tag(9, 'servers', bytes([10]) + struct.pack('>i', 1) + entry)
root = tag(10, '', servers + b'\x00')
open(out, 'wb').write(root)
print('wrote', out, len(root), 'bytes')
