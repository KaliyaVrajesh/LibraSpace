"""
Booking service — core business logic for seat reservations.
Overlap prevention uses SELECT ... FOR UPDATE to serialize concurrent requests.
"""
from datetime import date, time, datetime, timezone
from typing import Optional, Tuple, List

import structlog
from sqlalchemy import and_, or_, func
from sqlalchemy.exc import IntegrityError

from app.database import db
from app.models.booking import Booking, BookingStatus, generate_booking_reference
from app.models.seat import Seat
from app.models.floor import Floor
from app.models.user import User

logger = structlog.get_logger(__name__)


class BookingError(Exception):
    """Business logic error for bookings."""

    def __init__(self, message: str, code: str = "BOOKING_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class BookingService:
    """Handles all booking operations with proper transactional safety."""

    @staticmethod
    def create_booking(
        user_id: str,
        seat_id: str,
        booking_date: date,
        start_time: time,
        end_time: time,
    ) -> Booking:
        """
        Create a booking with overlap prevention.

        Strategy: SELECT FOR UPDATE on the seat row, then check overlaps.
        This serializes concurrent booking attempts for the same seat.
        """
        # Fetch seat with a row lock to prevent concurrent bookings
        seat = (
            Seat.query.filter_by(id=seat_id)
            .with_for_update()
            .first()
        )

        if not seat:
            raise BookingError("Seat not found", "SEAT_NOT_FOUND")
        if not seat.is_active:
            raise BookingError("This seat is not available for booking", "SEAT_INACTIVE")

        # Check floor is active
        floor = Floor.query.get(seat.floor_id)
        if not floor or not floor.is_active:
            raise BookingError("Floor is not available", "FLOOR_INACTIVE")

        # Check for overlap — this query runs within the same transaction
        overlap = Booking.query.filter(
            Booking.seat_id == seat_id,
            Booking.booking_date == booking_date,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        ).first()

        if overlap:
            raise BookingError(
                f"Seat {seat.seat_label} is already booked from "
                f"{overlap.start_time.strftime('%H:%M')} to "
                f"{overlap.end_time.strftime('%H:%M')} on {booking_date}",
                "SEAT_UNAVAILABLE",
            )

        # Check user doesn't have overlapping booking on same date/time
        user_overlap = Booking.query.filter(
            Booking.user_id == user_id,
            Booking.booking_date == booking_date,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        ).first()

        if user_overlap:
            raise BookingError(
                "You already have a booking for an overlapping time slot",
                "USER_OVERLAP",
            )

        # Generate unique booking reference with retry
        max_retries = 5
        for attempt in range(max_retries):
            ref = generate_booking_reference()
            if not Booking.query.filter_by(booking_reference=ref).first():
                break
        else:
            raise BookingError("Could not generate unique booking reference", "REF_ERROR")

        booking = Booking(
            user_id=user_id,
            seat_id=seat_id,
            booking_reference=ref,
            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,
            status=BookingStatus.CONFIRMED,
        )

        db.session.add(booking)

        try:
            db.session.commit()
            logger.info(
                "Booking created",
                booking_ref=ref,
                user_id=str(user_id),
                seat_id=str(seat_id),
                date=str(booking_date),
            )
            return booking
        except IntegrityError as e:
            db.session.rollback()
            logger.warning("Booking integrity error", error=str(e))
            raise BookingError("Booking conflict — please try again", "CONFLICT")

    @staticmethod
    def cancel_booking(booking_id: str, user_id: str, is_admin: bool = False) -> Booking:
        """Cancel a booking. Users can only cancel their own bookings."""
        booking = Booking.query.filter_by(id=booking_id).first()

        if not booking:
            raise BookingError("Booking not found", "NOT_FOUND")

        # Authorization check
        if not is_admin and str(booking.user_id) != str(user_id):
            raise BookingError("Not authorized to cancel this booking", "FORBIDDEN")

        if booking.status == BookingStatus.CANCELLED:
            raise BookingError("Booking is already cancelled", "ALREADY_CANCELLED")

        if booking.status == BookingStatus.COMPLETED or booking.is_completed():
            raise BookingError("Cannot cancel a completed booking", "ALREADY_COMPLETED")

        if not is_admin and not booking.is_cancellable():
            raise BookingError(
                "Booking cannot be cancelled (has already started)", "NOT_CANCELLABLE"
            )

        booking.status = BookingStatus.CANCELLED
        db.session.commit()

        logger.info(
            "Booking cancelled",
            booking_ref=booking.booking_reference,
            cancelled_by=str(user_id),
            is_admin=is_admin,
        )
        return booking

    @staticmethod
    def get_available_seats(
        floor_id: str,
        booking_date: date,
        start_time: time,
        end_time: time,
    ) -> List[dict]:
        """
        Return availability status for all active seats on a floor.
        """
        seats = (
            Seat.query.filter_by(floor_id=floor_id, is_active=True)
            .order_by(Seat.row_number, Seat.column_number)
            .all()
        )

        if not seats:
            return []

        seat_ids = [s.id for s in seats]

        # Get all conflicting bookings in one query
        conflicting_ids = set()
        conflicting = (
            db.session.query(Booking.seat_id)
            .filter(
                Booking.seat_id.in_(seat_ids),
                Booking.booking_date == booking_date,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
            .all()
        )
        for row in conflicting:
            conflicting_ids.add(row.seat_id)

        result = []
        for seat in seats:
            seat_dict = seat.to_dict()
            seat_dict["availability_status"] = (
                "occupied" if seat.id in conflicting_ids else "available"
            )
            result.append(seat_dict)

        return result

    @staticmethod
    def complete_expired_bookings() -> int:
        """
        Mark confirmed bookings whose end time has passed as completed.
        Returns count of updated bookings. Call periodically (e.g., health check,
        or a scheduled cron job on the EC2 instance).
        """
        now = datetime.now(timezone.utc)
        today = now.date()
        current_time = now.time()

        # Bookings that ended in the past
        expired = Booking.query.filter(
            Booking.status == BookingStatus.CONFIRMED,
            or_(
                Booking.booking_date < today,
                and_(
                    Booking.booking_date == today,
                    Booking.end_time <= current_time,
                ),
            ),
        ).all()

        count = 0
        for booking in expired:
            booking.status = BookingStatus.COMPLETED
            count += 1

        if count:
            db.session.commit()
            logger.info("Completed expired bookings", count=count)

        return count

    @staticmethod
    def get_user_bookings(
        user_id: str,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ):
        """Get paginated bookings for a user."""
        query = Booking.query.filter_by(user_id=user_id).order_by(
            Booking.booking_date.desc(), Booking.start_time.desc()
        )
        if status:
            query = query.filter_by(status=status)
        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_all_bookings(
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ):
        """Admin: get paginated bookings with optional filters."""
        from app.models.user import User

        query = (
            db.session.query(Booking)
            .join(User, Booking.user_id == User.id)
            .order_by(Booking.created_at.desc())
        )
        if status:
            query = query.filter(Booking.status == status)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Booking.booking_reference.ilike(search_term),
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                )
            )
        return query.paginate(page=page, per_page=per_page, error_out=False)
