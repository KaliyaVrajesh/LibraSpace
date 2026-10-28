"""
Tests for booking functionality.
"""
import pytest
from datetime import date, time, timedelta
from tests.conftest import auth_headers


def tomorrow():
    return (date.today() + timedelta(days=1)).isoformat()


def day_after():
    return (date.today() + timedelta(days=2)).isoformat()


class TestCreateBooking:
    def test_create_booking_success(self, client, student_user, student_token, sample_seat):
        resp = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert data["data"]["status"] == "confirmed"
        assert "booking_reference" in data["data"]
        assert data["data"]["booking_reference"].startswith("LIB-")

    def test_booking_unauthenticated(self, client, sample_seat, db):
        resp = client.post(
            "/api/bookings",
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert resp.status_code == 401

    def test_booking_in_past(self, client, student_user, student_token, sample_seat):
        past_date = (date.today() - timedelta(days=1)).isoformat()
        resp = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": past_date,
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert resp.status_code == 400

    def test_booking_end_before_start(self, client, student_user, student_token, sample_seat):
        resp = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "12:00",
                "end_time": "10:00",
            },
        )
        assert resp.status_code == 400

    def test_booking_too_short(self, client, student_user, student_token, sample_seat):
        resp = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "10:00",
                "end_time": "10:15",
            },
        )
        assert resp.status_code == 400

    def test_booking_too_long(self, client, student_user, student_token, sample_seat):
        resp = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "08:00",
                "end_time": "13:00",
            },
        )
        assert resp.status_code == 400


class TestOverlapPrevention:
    def test_overlapping_booking_rejected(
        self, client, student_user, admin_user, student_token, admin_token, sample_seat
    ):
        """Two bookings for the same seat at the same time must be rejected."""
        # First booking
        r1 = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert r1.status_code == 201

        # Second booking for overlapping time (admin user, different user)
        r2 = client.post(
            "/api/bookings",
            headers=auth_headers(admin_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "11:00",
                "end_time": "13:00",
            },
        )
        assert r2.status_code == 409
        assert r2.get_json()["code"] == "SEAT_UNAVAILABLE"

    def test_non_overlapping_booking_allowed(
        self, client, student_user, admin_user, student_token, admin_token, sample_seat
    ):
        """Back-to-back bookings with no overlap should be allowed."""
        r1 = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": day_after(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert r1.status_code == 201

        r2 = client.post(
            "/api/bookings",
            headers=auth_headers(admin_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": day_after(),
                "start_time": "12:00",
                "end_time": "14:00",
            },
        )
        assert r2.status_code == 201


class TestCancelBooking:
    def test_cancel_own_booking(self, client, student_user, student_token, sample_seat):
        # Create booking
        r = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "14:00",
                "end_time": "16:00",
            },
        )
        booking_id = r.get_json()["data"]["id"]

        # Cancel it
        rc = client.patch(
            f"/api/bookings/{booking_id}/cancel",
            headers=auth_headers(student_token),
        )
        assert rc.status_code == 200
        assert rc.get_json()["data"]["status"] == "cancelled"

    def test_cannot_cancel_another_users_booking(
        self, client, student_user, admin_user, student_token, admin_token, sample_seat
    ):
        # Student creates booking
        r = client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": (date.today() + timedelta(days=3)).isoformat(),
                "start_time": "09:00",
                "end_time": "11:00",
            },
        )
        booking_id = r.get_json()["data"]["id"]

        # Admin can cancel (admin override allowed)
        rc = client.patch(
            f"/api/bookings/{booking_id}/cancel",
            headers=auth_headers(admin_token),
        )
        assert rc.status_code == 200


class TestAvailability:
    def test_availability_endpoint(self, client, student_token, sample_floor, sample_seat):
        resp = client.get(
            "/api/availability",
            headers=auth_headers(student_token),
            query_string={
                "floor_id": str(sample_floor.id),
                "date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "seats" in data
        assert "summary" in data
        # The seat should show as available
        seat_data = next(
            (s for s in data["seats"] if s["id"] == str(sample_seat.id)), None
        )
        assert seat_data is not None
        assert seat_data["availability_status"] == "available"

    def test_seat_shows_occupied_when_booked(
        self, client, student_user, student_token, sample_floor, sample_seat
    ):
        # Book the seat
        client.post(
            "/api/bookings",
            headers=auth_headers(student_token),
            json={
                "seat_id": str(sample_seat.id),
                "booking_date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )

        # Check availability
        resp = client.get(
            "/api/availability",
            headers=auth_headers(student_token),
            query_string={
                "floor_id": str(sample_floor.id),
                "date": tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        seats = resp.get_json()["data"]["seats"]
        seat = next(s for s in seats if s["id"] == str(sample_seat.id))
        assert seat["availability_status"] == "occupied"


class TestAccessControl:
    def test_student_cannot_access_admin_bookings(
        self, client, student_token
    ):
        resp = client.get(
            "/api/admin/bookings", headers=auth_headers(student_token)
        )
        assert resp.status_code == 403

    def test_admin_can_access_all_bookings(self, client, admin_token):
        resp = client.get(
            "/api/admin/bookings", headers=auth_headers(admin_token)
        )
        assert resp.status_code == 200
