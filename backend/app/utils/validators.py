"""
Input validation utilities.
"""
import re
from datetime import date, time, datetime, timezone
from typing import Optional, Tuple

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """Validate email format."""
    if not email or not isinstance(email, str):
        return False, "Email is required"
    email = email.strip().lower()
    if len(email) > 254:
        return False, "Email is too long"
    if not EMAIL_PATTERN.match(email):
        return False, "Invalid email format"
    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Validate password strength."""
    if not password or not isinstance(password, str):
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password is too long"
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_upper and has_lower and has_digit):
        return (
            False,
            "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
        )
    return True, None


def validate_time_range(
    booking_date: date,
    start_time: time,
    end_time: time,
    open_hour: int = 8,
    close_hour: int = 22,
    max_hours: int = 4,
    min_minutes: int = 30,
) -> Tuple[bool, Optional[str]]:
    """Validate booking time range."""
    now_utc = datetime.now(timezone.utc)
    booking_start = datetime.combine(booking_date, start_time).replace(
        tzinfo=timezone.utc
    )

    if booking_start < now_utc:
        return False, "Cannot create a booking in the past"

    if end_time <= start_time:
        return False, "End time must be after start time"

    duration_minutes = (
        datetime.combine(booking_date, end_time)
        - datetime.combine(booking_date, start_time)
    ).seconds // 60

    if duration_minutes < min_minutes:
        return False, f"Minimum booking duration is {min_minutes} minutes"

    if duration_minutes > max_hours * 60:
        return False, f"Maximum booking duration is {max_hours} hours"

    if start_time.hour < open_hour:
        return False, f"Library opens at {open_hour:02d}:00"

    if end_time.hour > close_hour or (
        end_time.hour == close_hour and end_time.minute > 0
    ):
        return False, f"Library closes at {close_hour:02d}:00"

    return True, None


def parse_time(time_str: str) -> Optional[time]:
    """Parse HH:MM time string."""
    try:
        parts = time_str.strip().split(":")
        if len(parts) != 2:
            return None
        hour, minute = int(parts[0]), int(parts[1])
        return time(hour=hour, minute=minute)
    except (ValueError, AttributeError):
        return None


def sanitize_string(value: str, max_length: int = 255) -> str:
    """Basic string sanitization."""
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]
