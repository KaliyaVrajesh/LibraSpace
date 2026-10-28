"""
Pytest configuration and fixtures for LibraSpace backend tests.
Uses an isolated PostgreSQL test database.
"""
import os
import pytest
from datetime import date, time, timedelta

# Set test environment BEFORE importing app
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql://libraspace:libraspace_dev_pass@localhost:5432/libraspace_test",
)

from app import create_app
from app.database import db as _db
from app.models.user import User, UserRole
from app.models.floor import Floor
from app.models.seat import Seat, SeatType
from app.models.booking import Booking, BookingStatus, generate_booking_reference


@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    flask_app = create_app("testing")
    flask_app.config["TESTING"] = True
    flask_app.config["WTF_CSRF_ENABLED"] = False

    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture(scope="function")
def db(app):
    """Provide a clean database for each test (using nested transactions)."""
    with app.app_context():
        connection = _db.engine.connect()
        transaction = connection.begin()

        # Use session bound to connection
        _db.session.bind = connection

        yield _db

        _db.session.remove()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(app, db):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def student_user(db):
    """Create and return a test student user."""
    user = User(
        full_name="Test Student",
        email="student@test.com",
        role=UserRole.STUDENT,
        is_active=True,
    )
    user.set_password("Student1234")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def admin_user(db):
    """Create and return a test admin user."""
    user = User(
        full_name="Test Admin",
        email="admin@test.com",
        role=UserRole.ADMIN,
        is_active=True,
    )
    user.set_password("Admin1234")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_floor(db):
    """Create and return a test floor."""
    floor = Floor(
        name="Test Floor 1",
        floor_number=1,
        description="A test floor",
        is_active=True,
    )
    db.session.add(floor)
    db.session.commit()
    return floor


@pytest.fixture
def sample_seat(db, sample_floor):
    """Create and return a test seat."""
    seat = Seat(
        floor_id=sample_floor.id,
        seat_label="T01",
        row_number=1,
        column_number=1,
        seat_type=SeatType.REGULAR,
        is_active=True,
    )
    db.session.add(seat)
    db.session.commit()
    return seat


@pytest.fixture
def student_token(client, student_user):
    """Get a valid JWT token for the student user."""
    response = client.post(
        "/api/auth/login",
        json={"email": "student@test.com", "password": "Student1234"},
    )
    data = response.get_json()
    return data["data"]["access_token"]


@pytest.fixture
def admin_token(client, admin_user):
    """Get a valid JWT token for the admin user."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "Admin1234"},
    )
    data = response.get_json()
    return data["data"]["access_token"]


def auth_headers(token: str) -> dict:
    """Return authorization headers dict."""
    return {"Authorization": f"Bearer {token}"}
