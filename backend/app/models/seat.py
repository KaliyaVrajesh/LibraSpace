"""
Seat model for LibraSpace.
"""
import uuid
from app.database import db, TimestampMixin


class SeatType:
    REGULAR = "regular"
    WINDOW = "window"
    QUIET = "quiet"
    COMPUTER = "computer"
    GROUP = "group"

    ALL = [REGULAR, WINDOW, QUIET, COMPUTER, GROUP]


class Seat(db.Model, TimestampMixin):
    """Library seat model."""

    __tablename__ = "seats"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    floor_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_label = db.Column(db.String(20), nullable=False)
    row_number = db.Column(db.Integer, nullable=False)
    column_number = db.Column(db.Integer, nullable=False)
    seat_type = db.Column(
        db.String(20),
        nullable=False,
        default=SeatType.REGULAR,
        server_default=SeatType.REGULAR,
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default="true")

    # Relationships
    floor = db.relationship("Floor", back_populates="seats")
    bookings = db.relationship(
        "Booking",
        back_populates="seat",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        # Seat label must be unique within a floor
        db.UniqueConstraint("floor_id", "seat_label", name="uq_seats_floor_label"),
        # Row and column must be positive
        db.CheckConstraint("row_number >= 1", name="ck_seats_row_positive"),
        db.CheckConstraint("column_number >= 1", name="ck_seats_column_positive"),
        db.CheckConstraint(
            f"seat_type IN ('regular', 'window', 'quiet', 'computer', 'group')",
            name="ck_seats_seat_type",
        ),
        # Index for floor + status queries
        db.Index("ix_seats_floor_active", "floor_id", "is_active"),
    )

    def to_dict(self, include_floor: bool = False) -> dict:
        data = {
            "id": str(self.id),
            "floor_id": str(self.floor_id),
            "seat_label": self.seat_label,
            "row_number": self.row_number,
            "column_number": self.column_number,
            "seat_type": self.seat_type,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_floor and self.floor:
            data["floor"] = {
                "id": str(self.floor.id),
                "name": self.floor.name,
                "floor_number": self.floor.floor_number,
            }
        return data

    def __repr__(self) -> str:
        return f"<Seat {self.seat_label} Floor {self.floor_id}>"
