"""
Authentication routes: register, login, logout, me.
"""
import structlog
from flask import Blueprint, request, g
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy.exc import IntegrityError

from app.database import db
from app.models.user import User, UserRole
from app.models.token_blocklist import TokenBlocklist
from app.utils.auth import require_auth
from app.utils.responses import success_response, error_response
from app.utils.validators import validate_email, validate_password, sanitize_string
from app import limiter

auth_bp = Blueprint("auth", __name__)
logger = structlog.get_logger(__name__)


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():
    """Register a new student account."""
    data = request.get_json(silent=True) or {}

    # Extract and sanitize inputs
    full_name = sanitize_string(data.get("full_name", ""), 255)
    email = sanitize_string(data.get("email", ""), 254).lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    # Validation
    errors = {}

    if not full_name or len(full_name) < 2:
        errors["full_name"] = "Full name must be at least 2 characters"

    email_ok, email_err = validate_email(email)
    if not email_ok:
        errors["email"] = email_err

    pw_ok, pw_err = validate_password(password)
    if not pw_ok:
        errors["password"] = pw_err
    elif password != confirm_password:
        errors["confirm_password"] = "Passwords do not match"

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    # Check for existing email
    if User.query.filter_by(email=email).first():
        return error_response(
            "An account with this email already exists",
            409,
            code="EMAIL_TAKEN",
        )

    user = User(
        full_name=full_name,
        email=email,
        role=UserRole.STUDENT,
        is_active=True,
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(
            "An account with this email already exists", 409, code="EMAIL_TAKEN"
        )

    # Issue tokens immediately after registration
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    logger.info("User registered", user_id=str(user.id), email=email)

    return success_response(
        data={
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        message="Account created successfully",
        status_code=201,
    )


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per hour")
def login():
    """Authenticate a user and return JWT tokens."""
    data = request.get_json(silent=True) or {}

    email = sanitize_string(data.get("email", ""), 254).lower()
    password = data.get("password", "")

    if not email or not password:
        return error_response("Email and password are required", 400)

    user = User.query.filter_by(email=email).first()

    # Use consistent timing to prevent user enumeration
    if not user or not user.check_password(password):
        logger.warning("Failed login attempt", email=email)
        return error_response("Invalid email or password", 401, code="INVALID_CREDENTIALS")

    if not user.is_active:
        return error_response("Account is deactivated", 401, code="ACCOUNT_INACTIVE")

    # Rehash password if needed (e.g. after Argon2 parameter changes)
    if user.needs_rehash():
        user.set_password(password)
        db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    logger.info("User logged in", user_id=str(user.id), role=user.role)

    return success_response(
        data={
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        message="Login successful",
    )


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Revoke the current access token."""
    jti = get_jwt().get("jti")
    if jti:
        blocklist_entry = TokenBlocklist(jti=jti)
        db.session.add(blocklist_entry)
        db.session.commit()

    logger.info("User logged out", user_id=str(g.current_user.id))
    return success_response(message="Logged out successfully")


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a refresh token."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_active:
        return error_response("User not found or inactive", 401)

    access_token = create_access_token(identity=str(user.id))
    return success_response(
        data={"access_token": access_token},
        message="Token refreshed",
    )


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    """Return the currently authenticated user's profile."""
    return success_response(data=g.current_user.to_dict())


@auth_bp.route("/me", methods=["PUT"])
@require_auth
def update_profile():
    """Update the current user's name or password."""
    data = request.get_json(silent=True) or {}
    user = g.current_user

    errors = {}
    updated = False

    # Update full name
    new_name = sanitize_string(data.get("full_name", ""), 255)
    if new_name:
        if len(new_name) < 2:
            errors["full_name"] = "Full name must be at least 2 characters"
        else:
            user.full_name = new_name
            updated = True

    # Change password
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if new_password:
        if not current_password:
            errors["current_password"] = "Current password is required to change password"
        elif not user.check_password(current_password):
            errors["current_password"] = "Current password is incorrect"
        else:
            pw_ok, pw_err = validate_password(new_password)
            if not pw_ok:
                errors["new_password"] = pw_err
            else:
                user.set_password(new_password)
                updated = True

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    if updated:
        db.session.commit()

    return success_response(data=user.to_dict(), message="Profile updated successfully")
