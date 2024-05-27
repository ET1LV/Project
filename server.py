import asyncio
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
import websockets
import json

# HTTP server handler
class MyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = 'Home.html'
        elif self.path == '/Map':
            self.path = 'Map.html'
        elif self.path == '/Monitoring':
            self.path = 'Monitoring.html'
        else:
            self.path = self.path.lstrip('/')
        return SimpleHTTPRequestHandler.do_GET(self)

# WebSocket handler
connected_clients = set()

async def websocket_handler(websocket, path):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            if data['type'] in ['offer', 'answer', 'candidate']:
                for client in connected_clients:
                    if client != websocket:
                        await client.send(message)
            elif data['type'] == 'mouse':
                handle_mouse_event(data)
            elif data['type'] == 'keyboard':
                handle_keyboard_event(data)
    finally:
        connected_clients.remove(websocket)

def handle_mouse_event(data):
    for client in connected_clients:
        asyncio.create_task(client.send(json.dumps(data)))

def handle_keyboard_event(data):
    for client in connected_clients:
        asyncio.create_task(client.send(json.dumps(data)))

# Run the HTTP server
def run_http_server():
    port = 8080
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', port)
    httpd = HTTPServer(server_address, MyHandler)
    print(f"Starting HTTP server on port {port}")
    httpd.serve_forever()

# Run the WebSocket server
async def run_websocket_server():
    server = await websockets.serve(websocket_handler, "localhost", 8765)
    await server.wait_closed()

# Run both servers concurrently
def main():
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, run_http_server)
    loop.run_until_complete(run_websocket_server())

if __name__ == "__main__":
    main()
