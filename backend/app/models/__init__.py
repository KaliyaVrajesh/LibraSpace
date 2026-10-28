"""
Models package — import all models so Flask-Migrate can detect them.
"""
from app.models.user import User, UserRole
from app.models.floor import Floor
from app.models.seat import Seat, SeatType
from app.models.booking import Booking, BookingStatus, generate_booking_reference
from app.models.token_blocklist import TokenBlocklist

__all__ = [
    "User",
    "UserRole",
    "Floor",
    "Seat",
    "SeatType",
    "Booking",
    "BookingStatus",
    "generate_booking_reference",
    "TokenBlocklist",
]
