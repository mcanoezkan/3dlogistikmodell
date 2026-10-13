#!/usr/bin/env python3
"""Startet die Logistikmodelle auf einem freien Port unter http://localhost:<port>/ und öffnet den Browser.

Aufruf:  python3 start.py                 Klinikum Bielefeld-Mitte (index.html), freier Port
         python3 start.py hanau           Klinikum Hanau (hanau.html), freier Port
         python3 start.py hanau 8090      Klinikum Hanau auf festem Port
         python3 start.py 8090            Bielefeld auf festem Port
Beenden: Strg+C
"""
import functools, http.server, socket, socketserver, sys, threading, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELLE = {
    'bielefeld': ('index.html', 'Klinikum Bielefeld-Mitte'),
    'hanau': ('hanau.html', 'Klinikum Hanau'),
}


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


args = sys.argv[1:]
modell = next((a.lower() for a in args if a.lower() in MODELLE), 'bielefeld')
ports = [a for a in args if a.isdigit()]
port = int(ports[0]) if ports else free_port()
datei, name = MODELLE[modell]

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
    url = f"http://localhost:{port}/{datei}"
    print(f"Logistikmodell {name} läuft unter {url}  (Beenden mit Strg+C)")
    for k, (d, n) in MODELLE.items():
        if k != modell:
            print(f"  ebenfalls verfügbar: {n} unter http://localhost:{port}/{d}")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
