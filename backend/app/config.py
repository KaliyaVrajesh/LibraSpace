"""
LibraSpace Configuration
Environment-based configuration for development, testing, and production.
"""
import os
import json
import logging
from datetime import timedelta
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError


def get_secret(secret_name: str, region_name: str) -> Optional[dict]:
    """Retrieve secret from AWS Secrets Manager."""
    try:
        client = boto3.client("secretsmanager", region_name=region_name)
        response = client.get_secret_value(SecretId=secret_name)
        secret_string = response.get("SecretString")
        if secret_string:
            return json.loads(secret_string)
    except (ClientError, NoCredentialsError) as e:
        logging.warning(f"Could not retrieve secret '{secret_name}': {e}")
    return None


class BaseConfig:
    """Base configuration shared across environments."""

    # Flask
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "change-me-in-production")
    DEBUG: bool = False
    TESTING: bool = False

    # JWT
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(days=30)
    JWT_ALGORITHM: str = "HS256"
    JWT_TOKEN_LOCATION: list = ["headers"]
    JWT_HEADER_NAME: str = "Authorization"
    JWT_HEADER_TYPE: str = "Bearer"

    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    # Library settings
    LIBRARY_TIMEZONE: str = os.environ.get("LIBRARY_TIMEZONE", "Asia/Kolkata")
    LIBRARY_OPEN_HOUR: int = int(os.environ.get("LIBRARY_OPEN_HOUR", "8"))
    LIBRARY_CLOSE_HOUR: int = int(os.environ.get("LIBRARY_CLOSE_HOUR", "22"))
    MAX_BOOKING_HOURS: int = int(os.environ.get("MAX_BOOKING_HOURS", "4"))
    MIN_BOOKING_MINUTES: int = int(os.environ.get("MIN_BOOKING_MINUTES", "30"))

    # Rate limiting
    RATELIMIT_DEFAULT: str = "1000 per hour"
    RATELIMIT_STORAGE_URI: str = os.environ.get("REDIS_URL", "memory://")

    # Logging
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")


class DevelopmentConfig(BaseConfig):
    """Development configuration."""

    DEBUG = True
    ENV = "development"

    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://libraspace:libraspace_dev_pass@localhost:5432/libraspace_dev",
    )
    SQLALCHEMY_ECHO: bool = False

    CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]


class TestingConfig(BaseConfig):
    """Testing configuration."""

    TESTING = True
    DEBUG = True
    ENV = "testing"

    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://libraspace:libraspace_dev_pass@localhost:5432/libraspace_test",
    )
    SQLALCHEMY_ECHO = False

    # Disable rate limiting in tests
    RATELIMIT_ENABLED = False

    # Short token expiry for testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production configuration using AWS Secrets Manager."""

    ENV = "production"
    DEBUG = False

    # Connection pooling for multiple EC2 instances
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

    def __init__(self):
        super().__init__()
        self._load_production_secrets()

    def _load_production_secrets(self):
        """Load secrets from AWS Secrets Manager."""
        secret_name = os.environ.get("DB_SECRET_ARN") or os.environ.get("DB_SECRET_NAME")
        region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")

        if secret_name:
            secrets = get_secret(secret_name, region)
            if secrets:
                host = secrets.get("host")
                port = secrets.get("port", 5432)
                dbname = secrets.get("dbname", "libraspace")
                username = secrets.get("username")
                password = secrets.get("password")

                if all([host, username, password]):
                    self.SQLALCHEMY_DATABASE_URI = (
                        f"postgresql://{username}:{password}@{host}:{port}/{dbname}"
                    )
                    return

        # Fallback to environment variable (should not contain plaintext passwords)
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            self.SQLALCHEMY_DATABASE_URI = db_url
        else:
            raise RuntimeError(
                "Production database configuration missing. "
                "Set DB_SECRET_ARN (Secrets Manager) or DATABASE_URL environment variable."
            )

        # Load app secrets
        app_secret_name = os.environ.get("APP_SECRET_NAME")
        if app_secret_name:
            secrets = get_secret(app_secret_name, region)
            if secrets:
                self.SECRET_KEY = secrets.get("secret_key", self.SECRET_KEY)
                self.JWT_SECRET_KEY = secrets.get("jwt_secret_key", self.JWT_SECRET_KEY)

        # CORS for production — allow ALB or custom domain
        frontend_url = os.environ.get("FRONTEND_URL", "")
        alb_dns = os.environ.get("ALB_DNS_NAME", "")
        origins = []
        if frontend_url:
            origins.append(frontend_url)
        if alb_dns:
            origins.append(f"http://{alb_dns}")
            origins.append(f"https://{alb_dns}")
        self.CORS_ORIGINS = origins if origins else ["*"]


# Map name to config class
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
