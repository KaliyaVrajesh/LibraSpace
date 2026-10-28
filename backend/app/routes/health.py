"""
Health check endpoints for ALB and monitoring.
"""
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from sqlalchemy import text
from app.database import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Basic liveness probe. Returns 200 if the process is running.
    Used by ALB health checks.
    """
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "LibraSpace API",
        }
    ), 200


@health_bp.route("/health/ready", methods=["GET"])
def readiness_check():
    """
    Readiness probe — checks database connectivity.
    Returns 503 if the database is unreachable (prevents ALB from routing traffic).
    Does NOT expose database credentials or connection strings.
    """
    checks = {"database": False}

    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    all_healthy = all(checks.values())

    return jsonify(
        {
            "status": "ready" if all_healthy else "not_ready",
            "checks": {k: "ok" if v else "fail" for k, v in checks.items()},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    ), 200 if all_healthy else 503
