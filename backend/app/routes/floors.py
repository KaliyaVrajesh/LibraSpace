"""
Floor management routes.
"""
import structlog
from flask import Blueprint, request, g
from app.database import db
from app.models.floor import Floor
from app.models.booking import Booking, BookingStatus
from app.utils.auth import require_auth, require_admin
from app.utils.responses import success_response, error_response
from app.utils.validators import sanitize_string

floors_bp = Blueprint("floors", __name__)
logger = structlog.get_logger(__name__)


@floors_bp.route("/floors", methods=["GET"])
@require_auth
def list_floors():
    """List all floors. Active-only unless admin."""
    include_inactive = request.args.get("include_inactive", "false").lower() == "true"

    query = Floor.query.order_by(Floor.floor_number)
    if not g.current_user.is_admin() or not include_inactive:
        query = query.filter_by(is_active=True)

    floors = query.all()
    return success_response(
        data=[f.to_dict(include_seat_count=True) for f in floors],
        message=f"Found {len(floors)} floor(s)",
    )


@floors_bp.route("/floors/<floor_id>", methods=["GET"])
@require_auth
def get_floor(floor_id):
    """Get a specific floor."""
    floor = Floor.query.get(floor_id)
    if not floor:
        return error_response("Floor not found", 404)
    if not floor.is_active and not g.current_user.is_admin():
        return error_response("Floor not found", 404)
    return success_response(data=floor.to_dict(include_seat_count=True))


@floors_bp.route("/floors", methods=["POST"])
@require_admin
def create_floor():
    """Admin: create a new floor."""
    data = request.get_json(silent=True) or {}

    errors = {}
    name = sanitize_string(data.get("name", ""), 100)
    floor_number = data.get("floor_number")
    description = sanitize_string(data.get("description", ""), 500)

    if not name:
        errors["name"] = "Floor name is required"
    if floor_number is None:
        errors["floor_number"] = "Floor number is required"
    elif not isinstance(floor_number, int) or floor_number < 0:
        errors["floor_number"] = "Floor number must be a non-negative integer"

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    if Floor.query.filter_by(floor_number=floor_number).first():
        return error_response(
            f"Floor number {floor_number} already exists", 409, code="FLOOR_EXISTS"
        )

    floor = Floor(
        name=name,
        floor_number=floor_number,
        description=description or None,
        is_active=True,
    )
    db.session.add(floor)
    db.session.commit()

    logger.info("Floor created", floor_id=str(floor.id), name=name)
    return success_response(data=floor.to_dict(), message="Floor created", status_code=201)


@floors_bp.route("/floors/<floor_id>", methods=["PUT"])
@require_admin
def update_floor(floor_id):
    """Admin: update a floor."""
    floor = Floor.query.get(floor_id)
    if not floor:
        return error_response("Floor not found", 404)

    data = request.get_json(silent=True) or {}
    errors = {}

    if "name" in data:
        name = sanitize_string(data["name"], 100)
        if not name:
            errors["name"] = "Floor name cannot be empty"
        else:
            floor.name = name

    if "floor_number" in data:
        fn = data["floor_number"]
        if not isinstance(fn, int) or fn < 0:
            errors["floor_number"] = "Floor number must be a non-negative integer"
        else:
            existing = Floor.query.filter_by(floor_number=fn).first()
            if existing and str(existing.id) != floor_id:
                errors["floor_number"] = f"Floor number {fn} is already in use"
            else:
                floor.floor_number = fn

    if "description" in data:
        floor.description = sanitize_string(data["description"], 500) or None

    if "is_active" in data:
        floor.is_active = bool(data["is_active"])

    if errors:
        return error_response("Validation failed", 400, errors=errors)

    db.session.commit()
    logger.info("Floor updated", floor_id=floor_id)
    return success_response(data=floor.to_dict(), message="Floor updated")


@floors_bp.route("/floors/<floor_id>", methods=["DELETE"])
@require_admin
def delete_floor(floor_id):
    """Admin: delete a floor (only if no future bookings exist)."""
    floor = Floor.query.get(floor_id)
    if not floor:
        return error_response("Floor not found", 404)

    # Check for any active bookings on this floor's seats
    from app.models.seat import Seat
    from datetime import date

    seats = floor.seats.with_entities(Seat.id).all()
    seat_ids = [s.id for s in seats]

    if seat_ids:
        active_bookings = Booking.query.filter(
            Booking.seat_id.in_(seat_ids),
            Booking.status == BookingStatus.CONFIRMED,
            Booking.booking_date >= date.today(),
        ).count()

        if active_bookings > 0:
            return error_response(
                f"Cannot delete floor with {active_bookings} active upcoming booking(s)",
                409,
                code="HAS_BOOKINGS",
            )

    db.session.delete(floor)
    db.session.commit()
    logger.info("Floor deleted", floor_id=floor_id)
    return success_response(message="Floor deleted successfully")
