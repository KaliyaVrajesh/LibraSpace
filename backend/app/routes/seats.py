"""
Seat management routes.
"""
import structlog
from flask import Blueprint, request, g
from app.database import db
from app.models.seat import Seat, SeatType
from app.models.floor import Floor
from app.models.booking import Booking, BookingStatus
from app.utils.auth import require_auth, require_admin
from app.utils.responses import success_response, error_response
from app.utils.validators import sanitize_string
from datetime import date

seats_bp = Blueprint("seats", __name__)
logger = structlog.get_logger(__name__)


@seats_bp.route("/floors/<floor_id>/seats", methods=["GET"])
@require_auth
def list_seats(floor_id):
    """List seats for a floor."""
    floor = Floor.query.get(floor_id)
    if not floor:
        return error_response("Floor not found", 404)
    if not floor.is_active and not g.current_user.is_admin():
        return error_response("Floor not found", 404)

    include_inactive = (
        request.args.get("include_inactive", "false").lower() == "true"
        and g.current_user.is_admin()
    )

    query = Seat.query.filter_by(floor_id=floor_id).order_by(
        Seat.row_number, Seat.column_number
    )
    if not include_inactive:
        query = query.filter_by(is_active=True)

    seats = query.all()
    return success_response(
        data=[s.to_dict() for s in seats],
        message=f"Found {len(seats)} seat(s)",
    )


@seats_bp.route("/seats/<seat_id>", methods=["GET"])
@require_auth
def get_seat(seat_id):
    """Get a specific seat."""
    seat = Seat.query.get(seat_id)
    if not seat:
        return error_response("Seat not found", 404)
    return success_response(data=seat.to_dict(include_floor=True))


@seats_bp.route("/seats", methods=["POST"])
@require_admin
def create_seat():
    """Admin: create a new seat."""
    data = request.get_json(silent=True) or {}
    errors = {}

    floor_id = data.get("floor_id")
    seat_label = sanitize_string(data.get("seat_label", ""), 20)
    row_number = data.get("row_number")
    column_number = data.get("column_number")
    seat_type = data.get("seat_type", SeatType.REGULAR)

    if not floor_id:
        errors["floor_id"] = "Floor ID is required"
    else:
        floor = Floor.query.get(floor_id)
        if not floor:
            errors["floor_id"] = "Floor not found"

    if not seat_label:
        errors["seat_label"] = "Seat label is required"

    if row_number is None or not isinstance(row_number, int) or row_number < 1:
        errors["row_number"] = "Row number must be a positive integer"

    if column_number is None or not isinstance(column_number, int) or column_number < 1:
        errors["column_number"] = "Column number must be a positive integer"

    if seat_type not in SeatType.ALL:
        errors["seat_type"] = f"Seat type must be one of: {', '.join(SeatType.ALL)}"

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    # Check for duplicate label on same floor
    if Seat.query.filter_by(floor_id=floor_id, seat_label=seat_label).first():
        return error_response(
            f"Seat label '{seat_label}' already exists on this floor",
            409,
            code="LABEL_TAKEN",
        )

    seat = Seat(
        floor_id=floor_id,
        seat_label=seat_label,
        row_number=row_number,
        column_number=column_number,
        seat_type=seat_type,
        is_active=True,
    )
    db.session.add(seat)
    db.session.commit()

    logger.info("Seat created", seat_id=str(seat.id), label=seat_label)
    return success_response(data=seat.to_dict(), message="Seat created", status_code=201)


@seats_bp.route("/seats/<seat_id>", methods=["PUT"])
@require_admin
def update_seat(seat_id):
    """Admin: update a seat."""
    seat = Seat.query.get(seat_id)
    if not seat:
        return error_response("Seat not found", 404)

    data = request.get_json(silent=True) or {}
    errors = {}

    if "seat_label" in data:
        new_label = sanitize_string(data["seat_label"], 20)
        if not new_label:
            errors["seat_label"] = "Seat label cannot be empty"
        else:
            existing = Seat.query.filter_by(
                floor_id=seat.floor_id, seat_label=new_label
            ).first()
            if existing and str(existing.id) != seat_id:
                errors["seat_label"] = f"Label '{new_label}' already exists on this floor"
            else:
                seat.seat_label = new_label

    if "row_number" in data:
        rn = data["row_number"]
        if not isinstance(rn, int) or rn < 1:
            errors["row_number"] = "Row number must be a positive integer"
        else:
            seat.row_number = rn

    if "column_number" in data:
        cn = data["column_number"]
        if not isinstance(cn, int) or cn < 1:
            errors["column_number"] = "Column number must be a positive integer"
        else:
            seat.column_number = cn

    if "seat_type" in data:
        if data["seat_type"] not in SeatType.ALL:
            errors["seat_type"] = f"Seat type must be one of: {', '.join(SeatType.ALL)}"
        else:
            seat.seat_type = data["seat_type"]

    if "is_active" in data:
        seat.is_active = bool(data["is_active"])

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    db.session.commit()
    return success_response(data=seat.to_dict(), message="Seat updated")


@seats_bp.route("/seats/<seat_id>/status", methods=["PATCH"])
@require_admin
def update_seat_status(seat_id):
    """Admin: activate or deactivate a seat."""
    seat = Seat.query.get(seat_id)
    if not seat:
        return error_response("Seat not found", 404)

    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")

    if is_active is None:
        return error_response("is_active field is required", 400)

    seat.is_active = bool(is_active)
    db.session.commit()

    status = "activated" if seat.is_active else "deactivated"
    return success_response(data=seat.to_dict(), message=f"Seat {status}")


@seats_bp.route("/seats/<seat_id>", methods=["DELETE"])
@require_admin
def delete_seat(seat_id):
    """Admin: delete a seat (only if no active future bookings)."""
    seat = Seat.query.get(seat_id)
    if not seat:
        return error_response("Seat not found", 404)

    active_bookings = Booking.query.filter(
        Booking.seat_id == seat_id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.booking_date >= date.today(),
    ).count()

    if active_bookings > 0:
        return error_response(
            f"Cannot delete seat with {active_bookings} active upcoming booking(s)",
            409,
            code="HAS_BOOKINGS",
        )

    db.session.delete(seat)
    db.session.commit()
    logger.info("Seat deleted", seat_id=seat_id)
    return success_response(message="Seat deleted successfully")
