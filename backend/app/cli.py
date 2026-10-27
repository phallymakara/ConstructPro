import argparse
import socket
import sys
import uvicorn

# Reconfigure stdout/stderr to UTF-8 to prevent charmap encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.config import settings


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a TCP port is currently open and responding (i.e. occupied)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def find_available_port(start_port: int, max_attempts: int = 50, host: str = "127.0.0.1") -> int:
    """Find the next available port starting from start_port to prevent port collisions."""
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port, host):
            return port
    return start_port


def main():
    parser = argparse.ArgumentParser(description="ConstructPro Backend API Server")
    parser.add_argument(
        "--port",
        type=int,
        default=settings.PORT,
        help=f"Port to bind server (default: {settings.PORT})",
    )
    parser.add_argument(
        "--host",
        type=str,
        default=settings.HOST,
        help=f"Host interface to bind server (default: {settings.HOST})",
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload",
    )
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Run database seed script (Khmer dataset) and exit",
    )
    args, _ = parser.parse_known_args()

    if args.seed:
        print("\n[ConstructPro] 📦 Starting Khmer database seeding...")
        import sys
        import os
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from seed_khmer_data import seed_khmer_database
        seed_khmer_database()
        print("[ConstructPro] ✅ Database seeding finished successfully.\n")
        return

    active_port = find_available_port(args.port, host="127.0.0.1")

    if active_port != args.port:
        print(f"\n[ConstructPro] ⚠️  Port {args.port} is already in use by another application.")
        print(f"[ConstructPro] 🔄 Automatically switched to available port: {active_port} to prevent conflict.\n")
    else:
        print(f"\n[ConstructPro] 🚀 Starting backend on port {active_port}...\n")

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=active_port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
