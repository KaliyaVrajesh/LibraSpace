"""
Tests for authentication endpoints.
"""
import pytest
from tests.conftest import auth_headers


class TestRegister:
    def test_register_success(self, client, db):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "New User",
                "email": "new@test.com",
                "password": "NewPass1",
                "confirm_password": "NewPass1",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert data["data"]["user"]["role"] == "student"
        assert "password_hash" not in data["data"]["user"]

    def test_register_duplicate_email(self, client, student_user):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Another User",
                "email": "student@test.com",
                "password": "Another1",
                "confirm_password": "Another1",
            },
        )
        assert resp.status_code == 409

    def test_register_invalid_email(self, client, db):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Bad Email",
                "email": "notanemail",
                "password": "Password1",
                "confirm_password": "Password1",
            },
        )
        assert resp.status_code == 400
        assert "email" in resp.get_json()["errors"]

    def test_register_weak_password(self, client, db):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Weak Pass",
                "email": "weak@test.com",
                "password": "short",
                "confirm_password": "short",
            },
        )
        assert resp.status_code == 400
        assert "password" in resp.get_json()["errors"]

    def test_register_password_mismatch(self, client, db):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Mismatch",
                "email": "mismatch@test.com",
                "password": "Passw0rd1",
                "confirm_password": "Different1",
            },
        )
        assert resp.status_code == 400
        assert "confirm_password" in resp.get_json()["errors"]

    def test_register_role_is_student(self, client, db):
        """New registrations should always be student role."""
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Role Test",
                "email": "roletest@test.com",
                "password": "RoleTest1",
                "confirm_password": "RoleTest1",
                "role": "admin",  # Should be ignored
            },
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["user"]["role"] == "student"


class TestLogin:
    def test_login_success(self, client, student_user):
        resp = client.post(
            "/api/auth/login",
            json={"email": "student@test.com", "password": "Student1234"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert "access_token" in data["data"]

    def test_login_wrong_password(self, client, student_user):
        resp = client.post(
            "/api/auth/login",
            json={"email": "student@test.com", "password": "WrongPass1"},
        )
        assert resp.status_code == 401

    def test_login_unknown_email(self, client, db):
        resp = client.post(
            "/api/auth/login",
            json={"email": "nobody@test.com", "password": "Password1"},
        )
        assert resp.status_code == 401

    def test_login_missing_fields(self, client, db):
        resp = client.post("/api/auth/login", json={"email": "test@test.com"})
        assert resp.status_code == 400


class TestProtectedEndpoints:
    def test_get_me_authenticated(self, client, student_user, student_token):
        resp = client.get(
            "/api/auth/me", headers=auth_headers(student_token)
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["email"] == "student@test.com"

    def test_get_me_unauthenticated(self, client, db):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_get_me_invalid_token(self, client, db):
        resp = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert resp.status_code == 422


class TestLogout:
    def test_logout_success(self, client, student_user, student_token):
        resp = client.post(
            "/api/auth/logout", headers=auth_headers(student_token)
        )
        assert resp.status_code == 200

        # Token should now be revoked
        resp2 = client.get(
            "/api/auth/me", headers=auth_headers(student_token)
        )
        assert resp2.status_code == 401
