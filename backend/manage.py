"""
Flask CLI management commands.
Run with: flask --app manage:app <command>
"""
import os
import sys
import click
import structlog
from flask.cli import with_appcontext

# Load .env BEFORE the app is created so DATABASE_URL is available.
from dotenv import load_dotenv
_env_file = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_file, override=False)

# Add the project root (one level up from backend/) to sys.path so that
# `from scripts.seed import run_seed` resolves correctly regardless of
# which directory the user runs flask from.
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from app import create_app
from app.utils.logging import configure_logging

configure_logging(log_level=os.environ.get("LOG_LEVEL", "INFO"))

config_name = os.environ.get("FLASK_ENV", "development")
app = create_app(config_name)

logger = structlog.get_logger(__name__)


@app.cli.command("promote-admin")
@click.argument("email")
@with_appcontext
def promote_admin(email: str):
    """
    Promote an existing registered user to admin role.

    Usage: flask --app manage:app promote-admin user@example.com

    This is the secure way to create admin accounts. Register normally first,
    then run this command from an authorized operator's terminal.
    """
    from app.models.user import User, UserRole
    from app.database import db

    user = User.query.filter_by(email=email).first()
    if not user:
        click.echo(f"Error: No user found with email '{email}'", err=True)
        raise SystemExit(1)

    if user.role == UserRole.ADMIN:
        click.echo(f"User '{email}' is already an admin.")
        return

    user.role = UserRole.ADMIN
    db.session.commit()
    logger.info("User promoted to admin", email=email, user_id=str(user.id))
    click.echo(f"Success: '{user.full_name}' ({email}) has been promoted to admin.")


@app.cli.command("demote-admin")
@click.argument("email")
@with_appcontext
def demote_admin(email: str):
    """Demote an admin user to student role."""
    from app.models.user import User, UserRole
    from app.database import db

    user = User.query.filter_by(email=email).first()
    if not user:
        click.echo(f"Error: No user found with email '{email}'", err=True)
        raise SystemExit(1)

    user.role = UserRole.STUDENT
    db.session.commit()
    click.echo(f"'{user.full_name}' ({email}) has been demoted to student.")


@app.cli.command("seed")
@click.option("--with-bookings", is_flag=True, default=False, help="Also seed sample bookings")
@with_appcontext
def seed_data(with_bookings: bool):
    """
    Seed the database with sample floors, seats, and optionally bookings.
    DO NOT run this in production without understanding the implications.
    """
    from scripts.seed import run_seed
    run_seed(with_bookings=with_bookings)


@app.cli.command("complete-expired-bookings")
@with_appcontext
def complete_expired():
    """Manually trigger completion of expired bookings."""
    from app.services.booking_service import BookingService
    count = BookingService.complete_expired_bookings()
    click.echo(f"Completed {count} expired booking(s).")


@app.cli.command("list-users")
@with_appcontext
def list_users():
    """List all registered users (for debugging)."""
    from app.models.user import User
    users = User.query.order_by(User.created_at).all()
    if not users:
        click.echo("No users registered.")
        return
    click.echo(f"{'Email':<40} {'Name':<30} {'Role':<10} {'Active'}")
    click.echo("-" * 90)
    for u in users:
        click.echo(f"{u.email:<40} {u.full_name:<30} {u.role:<10} {u.is_active}")
