#!/usr/bin/env python3
"""Startet die Healthcare Simulation Suite (hss/) auf einem freien Port und öffnet den Browser.

Aufruf:  python3 start.py           (freier Port wird automatisch gewählt)
         python3 start.py 8090      (fester Port)
         python3 start.py kbm       (bisheriges Logistikmodell Klinikum Bielefeld-Mitte, index.html)
Beenden: Strg+C
"""
import functools, http.server, socket, socketserver, sys, threading, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


args = sys.argv[1:]
kbm = "kbm" in args
nums = [a for a in args if a.isdigit()]
port = int(nums[0]) if nums else free_port()
class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Liefert alle Dateien ohne Browser-Cache aus, damit nach einem Update keine alten Skripte geladen werden."""
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=str(ROOT))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
    url = f"http://localhost:{port}/index.html" if kbm else f"http://localhost:{port}/hss/index.html"
    name = "Logistikmodell Klinikum Bielefeld-Mitte" if kbm else "Healthcare Simulation Suite"
    print(f"{name} läuft unter {url}  (Beenden mit Strg+C)")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
