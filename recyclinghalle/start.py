#!/usr/bin/env python3
"""Startet das Modell der Indoor-Recyclingannahmestelle auf einem freien Port unter http://localhost:<port>/ und öffnet den Browser.

Aufruf:  python3 start.py           (freier Port wird automatisch gewählt)
         python3 start.py 8090      (fester Port)
Beenden: Strg+C
"""
import functools, http.server, socket, socketserver, sys, threading, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


port = int(sys.argv[1]) if len(sys.argv) > 1 else free_port()
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
    url = f"http://localhost:{port}/index.html"
    print(f"Indoor-Recyclingannahmestelle 3D läuft unter {url}  (Beenden mit Strg+C)")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
