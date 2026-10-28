"""
WSGI entry point for Gunicorn and local development.
"""
import os
import sys

# Load .env BEFORE anything else so DATABASE_URL etc. are in the environment.
# python-dotenv is a dependency so this always works.
from dotenv import load_dotenv

# Look for .env in the same directory as this file (backend/)
_env_file = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_file, override=False)  # override=False: real env vars take precedence

from app import create_app
from app.utils.logging import configure_logging

config_name = os.environ.get("FLASK_ENV", "development")
json_logs = config_name == "production"
configure_logging(
    log_level=os.environ.get("LOG_LEVEL", "INFO"),
    json_logs=json_logs,
)

app = create_app(config_name)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = config_name != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
