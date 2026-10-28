"""
Dashboard data endpoints.
"""
from datetime import date, datetime, timedelta, timezone
from flask import Blueprint, g
from sqlalchemy import func, and_

from app.database import db
from app.models.user import User, UserRole
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.booking import Booking, BookingStatus
from app.utils.auth import require_auth, require_admin
from app.utils.responses import success_response
from app.services.booking_service import BookingService

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/student", methods=["GET"])
@require_auth
def student_dashboard():
    """Student dashboard data."""
    user = g.current_user
    BookingService.complete_expired_bookings()

    today = date.today()

    # Upcoming confirmed bookings
    upcoming = (
        Booking.query.filter(
            Booking.user_id == user.id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.booking_date >= today,
        )
        .order_by(Booking.booking_date, Booking.start_time)
        .limit(5)
        .all()
    )

    # Recent bookings (last 10)
    recent = (
        Booking.query.filter_by(user_id=user.id)
        .order_by(Booking.created_at.desc())
        .limit(10)
        .all()
    )

    # Stats
    total_bookings = Booking.query.filter_by(user_id=user.id).count()
    completed = Booking.query.filter_by(
        user_id=user.id, status=BookingStatus.COMPLETED
    ).count()
    cancelled = Booking.query.filter_by(
        user_id=user.id, status=BookingStatus.CANCELLED
    ).count()
    upcoming_count = Booking.query.filter(
        Booking.user_id == user.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.booking_date >= today,
    ).count()

    # Available seats summary
    total_seats = Seat.query.filter_by(is_active=True).count()
    floors = Floor.query.filter_by(is_active=True).count()

    return success_response(
        data={
            "user": user.to_dict(),
            "stats": {
                "total_bookings": total_bookings,
                "completed_sessions": completed,
                "upcoming_bookings": upcoming_count,
                "cancelled_bookings": cancelled,
                "total_active_seats": total_seats,
                "total_floors": floors,
            },
            "upcoming_bookings": [b.to_dict(include_relations=True) for b in upcoming],
            "recent_bookings": [b.to_dict(include_relations=True) for b in recent],
        }
    )


@dashboard_bp.route("/dashboard/admin", methods=["GET"])
@require_admin
def admin_dashboard():
    """Admin dashboard data."""
    BookingService.complete_expired_bookings()

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Core stats
    total_students = User.query.filter_by(role=UserRole.STUDENT, is_active=True).count()
    total_floors = Floor.query.filter_by(is_active=True).count()
    total_seats = Seat.query.filter_by(is_active=True).count()
    total_bookings = Booking.query.count()

    # Today's stats
    todays_bookings = Booking.query.filter(
        Booking.booking_date == today,
        Booking.status == BookingStatus.CONFIRMED,
    ).count()

    # Active (confirmed future) bookings
    active_bookings = Booking.query.filter(
        Booking.status == BookingStatus.CONFIRMED,
        Booking.booking_date >= today,
    ).count()

    # Seat utilization: bookings today / total seats
    utilization = round((todays_bookings / total_seats * 100) if total_seats else 0, 1)

    # Booking trends — last 14 days
    trend_data = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        count = Booking.query.filter(
            Booking.booking_date == day,
            Booking.status != BookingStatus.CANCELLED,
        ).count()
        trend_data.append({"date": day.isoformat(), "bookings": count})

    # Recent bookings
    recent_bookings = (
        Booking.query.order_by(Booking.created_at.desc()).limit(10).all()
    )

    # Bookings by status
    status_counts = (
        db.session.query(Booking.status, func.count(Booking.id))
        .group_by(Booking.status)
        .all()
    )
    status_breakdown = {status: count for status, count in status_counts}

    # Top floors by bookings
    from app.models.seat import Seat as SeatModel

    floor_stats = (
        db.session.query(Floor.name, func.count(Booking.id).label("booking_count"))
        .join(SeatModel, SeatModel.floor_id == Floor.id)
        .join(Booking, Booking.seat_id == SeatModel.id)
        .filter(Booking.booking_date >= thirty_days_ago)
        .group_by(Floor.id, Floor.name)
        .order_by(func.count(Booking.id).desc())
        .all()
    )

    return success_response(
        data={
            "stats": {
                "total_students": total_students,
                "total_floors": total_floors,
                "total_seats": total_seats,
                "total_bookings": total_bookings,
                "active_bookings": active_bookings,
                "todays_bookings": todays_bookings,
                "seat_utilization_percent": utilization,
            },
            "booking_trends": trend_data,
            "status_breakdown": status_breakdown,
            "floor_stats": [
                {"floor": name, "bookings": count} for name, count in floor_stats
            ],
            "recent_bookings": [
                b.to_dict(include_relations=True) for b in recent_bookings
            ],
        }
    )
