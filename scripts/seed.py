"""
Seed script for LibraSpace.
Creates sample floors, seats, and optional bookings for demonstration.

Usage (from backend/ directory):
    python -m scripts.seed
    flask --app manage:app seed
    flask --app manage:app seed --with-bookings
"""
import sys
import os
import random
from datetime import date, time, timedelta, datetime, timezone

# Allow running directly from scripts/ or backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_seed(with_bookings: bool = False) -> None:
    """Execute seeding within an active Flask app context."""
    from app.database import db
    from app.models.floor import Floor
    from app.models.seat import Seat, SeatType
    from app.models.booking import Booking, BookingStatus, generate_booking_reference
    from app.models.user import User, UserRole

    print("🌱 Seeding database...")

    # === FLOORS ===
    floors_data = [
        {
            "name": "Ground Floor — General Reading",
            "floor_number": 0,
            "description": "Open seating area with general study tables. Ideal for group study and collaborative work.",
        },
        {
            "name": "First Floor — Quiet Study",
            "floor_number": 1,
            "description": "Quiet study zone with individual desks. No phone calls. Perfect for focused studying.",
        },
        {
            "name": "Second Floor — Computer Lab",
            "floor_number": 2,
            "description": "Computer workstations with high-speed internet, printing, and scanning facilities.",
        },
        {
            "name": "Third Floor — Research Wing",
            "floor_number": 3,
            "description": "Advanced research section with reference materials and window seats.",
        },
    ]

    created_floors = []
    for fd in floors_data:
        existing = Floor.query.filter_by(floor_number=fd["floor_number"]).first()
        if existing:
            print(f"  Floor {fd['floor_number']} already exists, skipping.")
            created_floors.append(existing)
            continue

        floor = Floor(
            name=fd["name"],
            floor_number=fd["floor_number"],
            description=fd["description"],
            is_active=True,
        )
        db.session.add(floor)
        db.session.flush()
        created_floors.append(floor)
        print(f"  Created floor: {floor.name}")

    db.session.commit()

    # === SEATS ===
    seat_configs = [
        # Ground floor: 5 rows x 6 cols = 30 seats, mixed types
        {
            "floor": created_floors[0],
            "rows": 5,
            "cols": 6,
            "type_pattern": lambda r, c: (
                SeatType.GROUP if c >= 5
                else SeatType.WINDOW if r == 0
                else SeatType.REGULAR
            ),
            "prefix": "G",
        },
        # First floor: 4 rows x 5 cols = 20 seats, quiet zone
        {
            "floor": created_floors[1],
            "rows": 4,
            "cols": 5,
            "type_pattern": lambda r, c: (
                SeatType.QUIET if c <= 1
                else SeatType.WINDOW if r == 0 and c == 4
                else SeatType.REGULAR
            ),
            "prefix": "Q",
        },
        # Second floor: 4 rows x 6 cols = 24 computer seats
        {
            "floor": created_floors[2],
            "rows": 4,
            "cols": 6,
            "type_pattern": lambda r, c: SeatType.COMPUTER,
            "prefix": "C",
        },
        # Third floor: 4 rows x 5 cols = 20 research seats
        {
            "floor": created_floors[3],
            "rows": 4,
            "cols": 5,
            "type_pattern": lambda r, c: (
                SeatType.WINDOW if c == 4
                else SeatType.QUIET if r == 0
                else SeatType.REGULAR
            ),
            "prefix": "R",
        },
    ]

    total_seats = 0
    for config in seat_configs:
        floor = config["floor"]
        seat_num = 1
        for row in range(1, config["rows"] + 1):
            for col in range(1, config["cols"] + 1):
                label = f"{config['prefix']}{seat_num:02d}"
                existing = Seat.query.filter_by(
                    floor_id=floor.id, seat_label=label
                ).first()
                if not existing:
                    seat = Seat(
                        floor_id=floor.id,
                        seat_label=label,
                        row_number=row,
                        column_number=col,
                        seat_type=config["type_pattern"](row - 1, col - 1),
                        is_active=True,
                    )
                    db.session.add(seat)
                    total_seats += 1
                seat_num += 1

    db.session.commit()
    print(f"  Created {total_seats} seats across {len(created_floors)} floors.")

    # === DEMO USERS (optional, for bookings demo) ===
    demo_users = []
    if with_bookings:
        demo_users_data = [
            {
                "full_name": "Alice Sharma",
                "email": "alice@demo.libraspace.local",
                "password": "Demo1234!",
                "role": UserRole.STUDENT,
            },
            {
                "full_name": "Bob Patel",
                "email": "bob@demo.libraspace.local",
                "password": "Demo1234!",
                "role": UserRole.STUDENT,
            },
            {
                "full_name": "Carol Singh",
                "email": "carol@demo.libraspace.local",
                "password": "Demo1234!",
                "role": UserRole.STUDENT,
            },
        ]

        for ud in demo_users_data:
            user = User.query.filter_by(email=ud["email"]).first()
            if not user:
                user = User(
                    full_name=ud["full_name"],
                    email=ud["email"],
                    role=ud["role"],
                    is_active=True,
                )
                user.set_password(ud["password"])
                db.session.add(user)
                print(f"  Created demo user: {ud['email']}")
            demo_users.append(user)

        db.session.commit()

    # === SAMPLE BOOKINGS ===
    if with_bookings and demo_users:
        print("  Creating sample bookings...")
        today = date.today()
        booking_count = 0

        # Past bookings (completed)
        for i in range(1, 8):
            past_date = today - timedelta(days=i)
            seats = Seat.query.filter_by(is_active=True).limit(4).all()
            for j, seat in enumerate(seats[:3]):
                user = demo_users[j % len(demo_users)]
                ref = generate_booking_reference()
                while Booking.query.filter_by(booking_reference=ref).first():
                    ref = generate_booking_reference()

                start_h = 9 + (j * 2)
                booking = Booking(
                    user_id=user.id,
                    seat_id=seat.id,
                    booking_reference=ref,
                    booking_date=past_date,
                    start_time=time(start_h, 0),
                    end_time=time(start_h + 2, 0),
                    status=BookingStatus.COMPLETED,
                )
                db.session.add(booking)
                booking_count += 1

        # Upcoming bookings (confirmed)
        for i in range(1, 5):
            future_date = today + timedelta(days=i)
            seats = Seat.query.filter_by(is_active=True).limit(6).all()
            for j, seat in enumerate(seats[:4]):
                user = demo_users[j % len(demo_users)]
                start_h = 10 + (j * 2)
                ref = generate_booking_reference()
                while Booking.query.filter_by(booking_reference=ref).first():
                    ref = generate_booking_reference()

                # Check no overlap
                overlap = Booking.query.filter(
                    Booking.seat_id == seat.id,
                    Booking.booking_date == future_date,
                    Booking.status == BookingStatus.CONFIRMED,
                    Booking.start_time < time(start_h + 2, 0),
                    Booking.end_time > time(start_h, 0),
                ).first()
                if overlap:
                    continue

                booking = Booking(
                    user_id=user.id,
                    seat_id=seat.id,
                    booking_reference=ref,
                    booking_date=future_date,
                    start_time=time(start_h, 0),
                    end_time=time(start_h + 2, 0),
                    status=BookingStatus.CONFIRMED,
                )
                db.session.add(booking)
                booking_count += 1

        db.session.commit()
        print(f"  Created {booking_count} sample bookings.")

    print("✅ Seeding complete!")
    if with_bookings and demo_users:
        print("\n📧 Demo user accounts (for testing only — NOT for production):")
        for u in demo_users:
            print(f"   Email: {u.email}  |  Password: Demo1234!")
        print("\n⚠️  These accounts use known passwords. Remove them before production use.")
    print("\n🔐 To create an admin account:")
    print("   1. Register a user via the web UI or API")
    print("   2. Run: flask --app manage:app promote-admin <email>")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed LibraSpace database")
    parser.add_argument(
        "--with-bookings", action="store_true", help="Also create sample bookings"
    )
    args = parser.parse_args()

    # Bootstrap Flask app
    from app import create_app
    from app.utils.logging import configure_logging

    configure_logging()
    config_name = os.environ.get("FLASK_ENV", "development")
    flask_app = create_app(config_name)

    with flask_app.app_context():
        run_seed(with_bookings=args.with_bookings)
