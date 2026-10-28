"""
Tests for floor and seat CRUD operations.
"""
import pytest
from tests.conftest import auth_headers


class TestFloors:
    def test_list_floors_authenticated(self, client, student_token, sample_floor):
        resp = client.get("/api/floors", headers=auth_headers(student_token))
        assert resp.status_code == 200
        floors = resp.get_json()["data"]
        assert any(f["id"] == str(sample_floor.id) for f in floors)

    def test_list_floors_unauthenticated(self, client, db):
        resp = client.get("/api/floors")
        assert resp.status_code == 401

    def test_admin_create_floor(self, client, admin_token, db):
        resp = client.post(
            "/api/floors",
            headers=auth_headers(admin_token),
            json={
                "name": "New Test Floor",
                "floor_number": 99,
                "description": "A test floor",
            },
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["name"] == "New Test Floor"

    def test_student_cannot_create_floor(self, client, student_token, db):
        resp = client.post(
            "/api/floors",
            headers=auth_headers(student_token),
            json={"name": "Unauthorized Floor", "floor_number": 98},
        )
        assert resp.status_code == 403

    def test_duplicate_floor_number_rejected(self, client, admin_token, sample_floor):
        resp = client.post(
            "/api/floors",
            headers=auth_headers(admin_token),
            json={"name": "Duplicate", "floor_number": sample_floor.floor_number},
        )
        assert resp.status_code == 409

    def test_update_floor(self, client, admin_token, sample_floor):
        resp = client.put(
            f"/api/floors/{sample_floor.id}",
            headers=auth_headers(admin_token),
            json={"name": "Updated Floor Name"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Updated Floor Name"

    def test_delete_floor_no_bookings(self, client, admin_token, db):
        # Create a floor with no bookings
        r = client.post(
            "/api/floors",
            headers=auth_headers(admin_token),
            json={"name": "Deletable Floor", "floor_number": 97},
        )
        floor_id = r.get_json()["data"]["id"]

        resp = client.delete(f"/api/floors/{floor_id}", headers=auth_headers(admin_token))
        assert resp.status_code == 200


class TestSeats:
    def test_list_seats(self, client, student_token, sample_floor, sample_seat):
        resp = client.get(
            f"/api/floors/{sample_floor.id}/seats",
            headers=auth_headers(student_token),
        )
        assert resp.status_code == 200
        seats = resp.get_json()["data"]
        assert any(s["id"] == str(sample_seat.id) for s in seats)

    def test_admin_create_seat(self, client, admin_token, sample_floor):
        resp = client.post(
            "/api/seats",
            headers=auth_headers(admin_token),
            json={
                "floor_id": str(sample_floor.id),
                "seat_label": "T99",
                "row_number": 5,
                "column_number": 5,
                "seat_type": "regular",
            },
        )
        assert resp.status_code == 201

    def test_duplicate_seat_label_rejected(self, client, admin_token, sample_floor, sample_seat):
        resp = client.post(
            "/api/seats",
            headers=auth_headers(admin_token),
            json={
                "floor_id": str(sample_floor.id),
                "seat_label": sample_seat.seat_label,
                "row_number": 2,
                "column_number": 2,
                "seat_type": "regular",
            },
        )
        assert resp.status_code == 409

    def test_invalid_seat_type_rejected(self, client, admin_token, sample_floor):
        resp = client.post(
            "/api/seats",
            headers=auth_headers(admin_token),
            json={
                "floor_id": str(sample_floor.id),
                "seat_label": "X01",
                "row_number": 1,
                "column_number": 1,
                "seat_type": "invalid_type",
            },
        )
        assert resp.status_code == 400

    def test_deactivate_seat(self, client, admin_token, sample_seat):
        resp = client.patch(
            f"/api/seats/{sample_seat.id}/status",
            headers=auth_headers(admin_token),
            json={"is_active": False},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_active"] is False


class TestHealth:
    def test_health_endpoint(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "healthy"

    def test_readiness_endpoint(self, client):
        resp = client.get("/api/health/ready")
        # Either ready or not_ready depending on DB, but should respond
        assert resp.status_code in (200, 503)
