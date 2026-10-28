"""
Booking routes — create, list, cancel, availability.
"""
import structlog
from datetime import date, datetime, timezone
from flask import Blueprint, request, g

from app.database import db
from app.models.booking import Booking, BookingStatus
from app.utils.auth import require_auth, require_admin
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.validators import validate_time_range, parse_time
from app.services.booking_service import BookingService, BookingError
from flask import current_app

bookings_bp = Blueprint("bookings", __name__)
logger = structlog.get_logger(__name__)


@bookings_bp.route("/bookings", methods=["GET"])
@require_auth
def list_bookings():
    """
    List bookings.
    - Students see only their own bookings.
    - Admins see all bookings (use /api/admin/bookings for admin view).
    """
    user = g.current_user
    status = request.args.get("status")
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))

    # Trigger completion of expired bookings opportunistically
    BookingService.complete_expired_bookings()

    if user.is_admin():
        search = request.args.get("search")
        pagination = BookingService.get_all_bookings(
            status=status, search=search, page=page, per_page=per_page
        )
    else:
        pagination = BookingService.get_user_bookings(
            user_id=str(user.id), status=status, page=page, per_page=per_page
        )

    items = [b.to_dict(include_relations=True) for b in pagination.items]
    return paginated_response(
        items=items,
        total=pagination.total,
        page=page,
        per_page=per_page,
    )


@bookings_bp.route("/bookings/<booking_id>", methods=["GET"])
@require_auth
def get_booking(booking_id):
    """Get a specific booking. Users can only view their own."""
    booking = Booking.query.get(booking_id)
    if not booking:
        return error_response("Booking not found", 404)

    if not g.current_user.is_admin() and str(booking.user_id) != str(g.current_user.id):
        return error_response("Not authorized", 403, code="FORBIDDEN")

    return success_response(data=booking.to_dict(include_relations=True))


@bookings_bp.route("/bookings", methods=["POST"])
@require_auth
def create_booking():
    """Create a new booking."""
    data = request.get_json(silent=True) or {}
    user = g.current_user

    # Students can only book for themselves
    user_id = str(user.id) if not user.is_admin() else data.get("user_id", str(user.id))

    seat_id = data.get("seat_id")
    booking_date_str = data.get("booking_date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")

    errors = {}

    if not seat_id:
        errors["seat_id"] = "Seat ID is required"

    # Parse date
    booking_date = None
    if not booking_date_str:
        errors["booking_date"] = "Booking date is required"
    else:
        try:
            booking_date = date.fromisoformat(booking_date_str)
            if booking_date < date.today():
                errors["booking_date"] = "Cannot book a seat in the past"
        except ValueError:
            errors["booking_date"] = "Invalid date format (use YYYY-MM-DD)"

    # Parse times
    start_time = None
    end_time = None
    if not start_time_str:
        errors["start_time"] = "Start time is required"
    else:
        start_time = parse_time(start_time_str)
        if not start_time:
            errors["start_time"] = "Invalid time format (use HH:MM)"

    if not end_time_str:
        errors["end_time"] = "End time is required"
    else:
        end_time = parse_time(end_time_str)
        if not end_time:
            errors["end_time"] = "Invalid time format (use HH:MM)"

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    # Validate time range
    time_ok, time_err = validate_time_range(
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        open_hour=current_app.config.get("LIBRARY_OPEN_HOUR", 8),
        close_hour=current_app.config.get("LIBRARY_CLOSE_HOUR", 22),
        max_hours=current_app.config.get("MAX_BOOKING_HOURS", 4),
        min_minutes=current_app.config.get("MIN_BOOKING_MINUTES", 30),
    )
    if not time_ok:
        return error_response(time_err, 400, errors={"time": time_err})

    try:
        booking = BookingService.create_booking(
            user_id=user_id,
            seat_id=seat_id,
            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,
        )
        return success_response(
            data=booking.to_dict(include_relations=True),
            message=f"Booking confirmed — Reference: {booking.booking_reference}",
            status_code=201,
        )
    except BookingError as e:
        return error_response(e.message, 409, code=e.code)


@bookings_bp.route("/bookings/<booking_id>/cancel", methods=["PATCH"])
@require_auth
def cancel_booking(booking_id):
    """Cancel a booking."""
    user = g.current_user
    try:
        booking = BookingService.cancel_booking(
            booking_id=booking_id,
            user_id=str(user.id),
            is_admin=user.is_admin(),
        )
        return success_response(
            data=booking.to_dict(include_relations=True),
            message="Booking cancelled successfully",
        )
    except BookingError as e:
        status = 404 if e.code == "NOT_FOUND" else (403 if e.code == "FORBIDDEN" else 409)
        return error_response(e.message, status, code=e.code)


@bookings_bp.route("/availability", methods=["GET"])
@require_auth
def get_availability():
    """
    Get seat availability for a floor, date, and time range.
    Query params: floor_id, date, start_time, end_time
    """
    floor_id = request.args.get("floor_id")
    date_str = request.args.get("date")
    start_time_str = request.args.get("start_time")
    end_time_str = request.args.get("end_time")

    errors = {}
    if not floor_id:
        errors["floor_id"] = "floor_id is required"

    booking_date = None
    if not date_str:
        errors["date"] = "date is required"
    else:
        try:
            booking_date = date.fromisoformat(date_str)
        except ValueError:
            errors["date"] = "Invalid date format (use YYYY-MM-DD)"

    start_time = None
    if not start_time_str:
        errors["start_time"] = "start_time is required"
    else:
        start_time = parse_time(start_time_str)
        if not start_time:
            errors["start_time"] = "Invalid time format (use HH:MM)"

    end_time = None
    if not end_time_str:
        errors["end_time"] = "end_time is required"
    else:
        end_time = parse_time(end_time_str)
        if not end_time:
            errors["end_time"] = "Invalid time format (use HH:MM)"

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    if end_time <= start_time:
        return error_response("End time must be after start time", 400)

    seats_availability = BookingService.get_available_seats(
        floor_id=floor_id,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
    )

    available_count = sum(
        1 for s in seats_availability if s["availability_status"] == "available"
    )

    return success_response(
        data={
            "seats": seats_availability,
            "summary": {
                "total": len(seats_availability),
                "available": available_count,
                "occupied": len(seats_availability) - available_count,
            },
            "query": {
                "floor_id": floor_id,
                "date": date_str,
                "start_time": start_time_str,
                "end_time": end_time_str,
            },
        }
    )


@bookings_bp.route("/admin/bookings", methods=["GET"])
@require_admin
def admin_list_bookings():
    """Admin: list all bookings with search and filter."""
    BookingService.complete_expired_bookings()

    status = request.args.get("status")
    search = request.args.get("search")
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))

    pagination = BookingService.get_all_bookings(
        status=status, search=search, page=page, per_page=per_page
    )

    items = [b.to_dict(include_relations=True) for b in pagination.items]
    return paginated_response(
        items=items,
        total=pagination.total,
        page=page,
        per_page=per_page,
    )
