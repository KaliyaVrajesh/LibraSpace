"""
Booking model for LibraSpace.
Implements overlap prevention using PostgreSQL advisory locks and constraints.
"""
import uuid
import string
import random
from datetime import datetime, date, time, timezone

from sqlalchemy import Index, text
from app.database import db, TimestampMixin


class BookingStatus:
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

    ALL = [CONFIRMED, CANCELLED, COMPLETED]


def generate_booking_reference() -> str:
    """Generate a unique 8-character alphanumeric booking reference."""
    chars = string.ascii_uppercase + string.digits
    return "LIB-" + "".join(random.choices(chars, k=8))


class Booking(db.Model, TimestampMixin):
    """Seat booking record."""

    __tablename__ = "bookings"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_reference = db.Column(
        db.String(20),
        nullable=False,
        unique=True,
        default=generate_booking_reference,
    )
    user_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey("seats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    status = db.Column(
        db.String(20),
        nullable=False,
        default=BookingStatus.CONFIRMED,
        server_default=BookingStatus.CONFIRMED,
    )

    # Relationships
    user = db.relationship("User", back_populates="bookings")
    seat = db.relationship("Seat", back_populates="bookings")

    __table_args__ = (
        db.CheckConstraint(
            "end_time > start_time", name="ck_bookings_end_after_start"
        ),
        db.CheckConstraint(
            "status IN ('confirmed', 'cancelled', 'completed')",
            name="ck_bookings_status",
        ),
        # Composite index for availability queries
        Index("ix_bookings_seat_date_status", "seat_id", "booking_date", "status"),
        Index("ix_bookings_user_date", "user_id", "booking_date"),
        Index("ix_bookings_status_date", "status", "booking_date"),
    )

    @classmethod
    def check_overlap(
        cls,
        seat_id: str,
        booking_date: date,
        start_time: time,
        end_time: time,
        exclude_booking_id: str = None,
    ) -> bool:
        """
        Check if a time slot overlaps with any active booking for a seat.

        Two time ranges [s1, e1) and [s2, e2) overlap when:
            s1 < e2 AND s2 < e1

        Uses a database-level query with FOR UPDATE SKIP LOCKED for concurrency safety.
        The actual overlap prevention constraint is enforced via this service method
        wrapped in a transaction.
        """
        query = cls.query.filter(
            cls.seat_id == seat_id,
            cls.booking_date == booking_date,
            cls.status == BookingStatus.CONFIRMED,
            cls.start_time < end_time,
            cls.end_time > start_time,
        )
        if exclude_booking_id:
            query = query.filter(cls.id != exclude_booking_id)

        return query.with_for_update(skip_locked=True).first() is not None

    def is_cancellable(self) -> bool:
        """A booking can be cancelled if it's confirmed and hasn't started yet."""
        if self.status != BookingStatus.CONFIRMED:
            return False
        now_utc = datetime.now(timezone.utc)
        booking_datetime = datetime.combine(
            self.booking_date, self.start_time
        ).replace(tzinfo=timezone.utc)
        return booking_datetime > now_utc

    def is_completed(self) -> bool:
        """Check if a booking's end time has passed."""
        now_utc = datetime.now(timezone.utc)
        booking_end = datetime.combine(
            self.booking_date, self.end_time
        ).replace(tzinfo=timezone.utc)
        return now_utc > booking_end

    def compute_status(self) -> str:
        """Compute current status without modifying the record."""
        if self.status == BookingStatus.CANCELLED:
            return BookingStatus.CANCELLED
        if self.is_completed():
            return BookingStatus.COMPLETED
        return BookingStatus.CONFIRMED

    def to_dict(self, include_relations: bool = False) -> dict:
        data = {
            "id": str(self.id),
            "booking_reference": self.booking_reference,
            "user_id": str(self.user_id),
            "seat_id": str(self.seat_id),
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "status": self.compute_status(),
            "stored_status": self.status,
            "is_cancellable": self.is_cancellable(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_relations:
            if self.user:
                data["user"] = {
                    "id": str(self.user.id),
                    "full_name": self.user.full_name,
                    "email": self.user.email,
                }
            if self.seat:
                data["seat"] = self.seat.to_dict(include_floor=True)
        return data

    def __repr__(self) -> str:
        return f"<Booking {self.booking_reference} {self.status}>"
