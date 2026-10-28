"""
LibraSpace Backend Application Factory
"""
import structlog
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.database import db
from app.config import config_by_name

# Extensions (initialized in create_app)
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri="memory://",
)

logger = structlog.get_logger(__name__)


def create_app(config_name: str = "development") -> Flask:
    """Application factory pattern."""
    app = Flask(__name__)

    # Load configuration
    cfg = config_by_name[config_name]
    app.config.from_object(cfg)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    # CORS configuration
    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", ["http://localhost:5173"]),
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.floors import floors_bp
    from app.routes.seats import seats_bp
    from app.routes.bookings import bookings_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.health import health_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(floors_bp, url_prefix="/api")
    app.register_blueprint(seats_bp, url_prefix="/api")
    app.register_blueprint(bookings_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if app.config.get("ENV") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has expired", "code": "TOKEN_EXPIRED"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"error": "Invalid token", "code": "INVALID_TOKEN"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"error": "Authentication required", "code": "UNAUTHORIZED"}, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has been revoked", "code": "TOKEN_REVOKED"}, 401

    logger.info("Application created", config=config_name)
    return app
