"""Initial schema — users, floors, seats, bookings, token_blocklist

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === USERS ===
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("role", sa.String(20), server_default="student", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("role IN ('student', 'admin')", name="ck_users_role"),
        sa.CheckConstraint("LENGTH(full_name) >= 2", name="ck_users_full_name_length"),
        sa.CheckConstraint("email LIKE '%@%'", name="ck_users_email_format"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # === FLOORS ===
    op.create_table(
        "floors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("floor_number", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("floor_number >= 0", name="ck_floors_floor_number_positive"),
        sa.CheckConstraint("LENGTH(name) >= 1", name="ck_floors_name_not_empty"),
        sa.PrimaryKeyConstraint("id", name="pk_floors"),
        sa.UniqueConstraint("floor_number", name="uq_floors_floor_number"),
    )

    # === SEATS ===
    op.create_table(
        "seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("floor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seat_label", sa.String(20), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("column_number", sa.Integer(), nullable=False),
        sa.Column("seat_type", sa.String(20), server_default="regular", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("row_number >= 1", name="ck_seats_row_positive"),
        sa.CheckConstraint("column_number >= 1", name="ck_seats_column_positive"),
        sa.CheckConstraint(
            "seat_type IN ('regular', 'window', 'quiet', 'computer', 'group')",
            name="ck_seats_seat_type",
        ),
        sa.ForeignKeyConstraint(
            ["floor_id"],
            ["floors.id"],
            name="fk_seats_floor_id_floors",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_seats"),
        sa.UniqueConstraint("floor_id", "seat_label", name="uq_seats_floor_label"),
    )
    op.create_index("ix_seats_floor_id", "seats", ["floor_id"])
    op.create_index("ix_seats_floor_active", "seats", ["floor_id", "is_active"])

    # === BOOKINGS ===
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_reference", sa.String(20), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seat_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", sa.String(20), server_default="confirmed", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("end_time > start_time", name="ck_bookings_end_after_start"),
        sa.CheckConstraint(
            "status IN ('confirmed', 'cancelled', 'completed')",
            name="ck_bookings_status",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_bookings_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["seat_id"],
            ["seats.id"],
            name="fk_bookings_seat_id_seats",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_bookings"),
        sa.UniqueConstraint("booking_reference", name="uq_bookings_booking_reference"),
    )
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])
    op.create_index("ix_bookings_seat_id", "bookings", ["seat_id"])
    op.create_index(
        "ix_bookings_seat_date_status", "bookings", ["seat_id", "booking_date", "status"]
    )
    op.create_index(
        "ix_bookings_user_date", "bookings", ["user_id", "booking_date"]
    )
    op.create_index(
        "ix_bookings_status_date", "bookings", ["status", "booking_date"]
    )

    # === TOKEN BLOCKLIST ===
    op.create_table(
        "token_blocklist",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("jti", sa.String(36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_token_blocklist"),
        sa.UniqueConstraint("jti", name="uq_token_blocklist_jti"),
    )
    op.create_index("ix_token_blocklist_jti", "token_blocklist", ["jti"])


def downgrade() -> None:
    op.drop_table("token_blocklist")
    op.drop_table("bookings")
    op.drop_table("seats")
    op.drop_table("floors")
    op.drop_table("users")
