"""
Authentication and authorization helpers.
"""
from functools import wraps
from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.utils.responses import error_response
from app.models.token_blocklist import TokenBlocklist


def get_current_user():
    """Get the currently authenticated user from the database."""
    from app.models.user import User

    user_id = get_jwt_identity()
    if not user_id:
        return None
    return User.query.get(user_id)


def require_auth(fn):
    """Decorator: require a valid JWT token."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        # Check token blocklist
        jti = get_jwt().get("jti")
        if jti and TokenBlocklist.query.filter_by(jti=jti).first():
            return error_response("Token has been revoked", 401, code="TOKEN_REVOKED")

        user = get_current_user()
        if not user:
            return error_response("User not found", 401, code="USER_NOT_FOUND")
        if not user.is_active:
            return error_response("Account is deactivated", 401, code="ACCOUNT_INACTIVE")

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def require_admin(fn):
    """Decorator: require admin role."""

    @wraps(fn)
    @require_auth
    def wrapper(*args, **kwargs):
        if not g.current_user.is_admin():
            return error_response(
                "Administrator access required", 403, code="FORBIDDEN"
            )
        return fn(*args, **kwargs)

    return wrapper


def require_student(fn):
    """Decorator: require student role (students only, not admin)."""

    @wraps(fn)
    @require_auth
    def wrapper(*args, **kwargs):
        from app.models.user import UserRole

        if g.current_user.role != UserRole.STUDENT:
            return error_response(
                "Student access required", 403, code="FORBIDDEN"
            )
        return fn(*args, **kwargs)

    return wrapper
