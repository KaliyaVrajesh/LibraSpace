"""Alembic migration environment.

This file is run by Alembic (via Flask-Migrate) for every `flask db` command.
It loads the .env file FIRST so DATABASE_URL is available before the Flask
app tries to connect.
"""
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# ── Load .env before Flask app creation ──────────────────────
# Try multiple paths because cwd varies depending on how flask is invoked.
from dotenv import load_dotenv

for _candidate in [
    # When run as `flask --app manage:app db upgrade` from backend/
    os.path.join(os.getcwd(), ".env"),
    # Absolute path relative to this file (migrations/../.env = backend/.env)
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")),
]:
    if os.path.isfile(_candidate):
        load_dotenv(_candidate, override=False)
        break

# ── Flask app and metadata ────────────────────────────────────
from app import create_app
from app.database import db

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

flask_app = create_app(os.environ.get("FLASK_ENV", "development"))

with flask_app.app_context():
    target_metadata = db.metadata
    # Grab the live database URL from the Flask/SQLAlchemy config
    _db_url = flask_app.config["SQLALCHEMY_DATABASE_URI"]


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL)."""
    context.configure(
        url=_db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the live database."""
    # Build the engine directly from the Flask-resolved URL so we don't
    # rely on alembic.ini having a sqlalchemy.url entry.
    connectable = create_engine(_db_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
