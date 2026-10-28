"""
JWT Token blocklist for logout/revocation support.
"""
import uuid
from datetime import datetime, timezone
from app.database import db


class TokenBlocklist(db.Model):
    """Stores revoked JWT JTI values."""

    __tablename__ = "token_blocklist"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<TokenBlocklist {self.jti}>"
