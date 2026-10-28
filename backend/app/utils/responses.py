"""
Standardized API response helpers.
"""
from flask import jsonify
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[dict] = None,
):
    """Return a standardized success JSON response."""
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    if meta:
        payload["meta"] = meta
    return jsonify(payload), status_code


def error_response(
    message: str,
    status_code: int = 400,
    errors: Optional[dict] = None,
    code: Optional[str] = None,
):
    """Return a standardized error JSON response."""
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    if code:
        payload["code"] = code
    return jsonify(payload), status_code


def paginated_response(
    items: list,
    total: int,
    page: int,
    per_page: int,
    message: str = "Success",
):
    """Return paginated data response."""
    return success_response(
        data=items,
        message=message,
        meta={
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
            "has_next": page * per_page < total,
            "has_prev": page > 1,
        },
    )
