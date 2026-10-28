"""
Floor model for LibraSpace.
"""
import uuid
from app.database import db, TimestampMixin


class Floor(db.Model, TimestampMixin):
    """Library floor model."""

    __tablename__ = "floors"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    floor_number = db.Column(db.Integer, nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default="true")

    # Relationships
    seats = db.relationship(
        "Seat",
        back_populates="floor",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint("floor_number >= 0", name="ck_floors_floor_number_positive"),
        db.CheckConstraint("LENGTH(name) >= 1", name="ck_floors_name_not_empty"),
    )

    @property
    def active_seat_count(self) -> int:
        """Count of active seats on this floor."""
        return self.seats.filter_by(is_active=True).count()

    def to_dict(self, include_seat_count: bool = False) -> dict:
        data = {
            "id": str(self.id),
            "name": self.name,
            "floor_number": self.floor_number,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_seat_count:
            data["active_seat_count"] = self.active_seat_count
        return data

    def __repr__(self) -> str:
        return f"<Floor {self.name} (#{self.floor_number})>"
