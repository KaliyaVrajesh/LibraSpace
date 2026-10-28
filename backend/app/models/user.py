"""
User model for LibraSpace.
"""
import uuid
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from sqlalchemy import Index

from app.database import db, TimestampMixin

ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


class UserRole:
    STUDENT = "student"
    ADMIN = "admin"


class User(db.Model, TimestampMixin):
    """User account model."""

    __tablename__ = "users"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(
        db.String(20),
        nullable=False,
        default=UserRole.STUDENT,
        server_default=UserRole.STUDENT,
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default="true")

    # Relationships
    bookings = db.relationship(
        "Booking",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint("role IN ('student', 'admin')", name="ck_users_role"),
        db.CheckConstraint("LENGTH(full_name) >= 2", name="ck_users_full_name_length"),
        db.CheckConstraint("email LIKE '%@%'", name="ck_users_email_format"),
    )

    def set_password(self, password: str) -> None:
        """Hash and store the password using Argon2."""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        self.password_hash = ph.hash(password)

    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        try:
            return ph.verify(self.password_hash, password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False

    def needs_rehash(self) -> bool:
        """Check if password needs to be rehashed (e.g., after parameter changes)."""
        return ph.check_needs_rehash(self.password_hash)

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def to_dict(self, include_private: bool = False) -> dict:
        """Serialize user to dictionary."""
        data = {
            "id": str(self.id),
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        # Never include password_hash in output
        return data

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
