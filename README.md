# LibraSpace — Smart Library Seat Booking System

A full-stack web application for university library seat management. Students browse interactive floor maps, reserve seats for specific time slots, and manage bookings. Administrators manage floors, seats, and all bookings.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  INTERNET                                                   │
│                    ┌─────────────────────────────────────┐  │
│                    │  Application Load Balancer (public)  │  │
│                    └─────────────────┬───────────────────┘  │
│                                      │                       │
│  ┌───────────────────────────────────▼──────────────────┐   │
│  │  EC2 Auto Scaling Group (private app subnets)        │   │
│  │  Flask + Gunicorn (Python 3.12)                      │   │
│  │  Serves both API (/api/*) and React SPA (/*/)        │   │
│  └───────────────────────────────────┬──────────────────┘   │
│                                      │                       │
│  ┌───────────────────────────────────▼──────────────────┐   │
│  │  Amazon RDS PostgreSQL (private db subnets)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  AWS Secrets Manager  │  IAM Roles  │  CloudWatch Logs      │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Python 3.12, Flask 3, SQLAlchemy 2, Flask-JWT-Extended |
| Database | PostgreSQL 16 (Docker locally, Amazon RDS in production) |
| Infrastructure | AWS (EC2 ASG, ALB, RDS, Secrets Manager) via Terraform |
| Auth | Argon2 password hashing, JWT Bearer tokens |

## Quick Start (Local Development)

See [SETUP.md](SETUP.md) for the complete guide.

```powershell
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Backend setup
cd backend
pip install -r requirements.txt
flask --app manage:app db upgrade
flask --app manage:app seed --with-bookings
python wsgi.py        # runs on :5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev           # runs on :5173
```

Visit http://localhost:5173

## Project Structure

```
LibraSpace/
├── backend/               Flask REST API
│   ├── app/
│   │   ├── models/        SQLAlchemy models (User, Floor, Seat, Booking)
│   │   ├── routes/        Flask blueprints
│   │   ├── services/      Business logic (BookingService)
│   │   └── utils/         Auth decorators, validators, responses
│   ├── migrations/        Alembic migrations
│   ├── tests/             pytest test suite
│   ├── wsgi.py            WSGI entry point
│   └── manage.py          Flask CLI commands
├── frontend/              React TypeScript SPA
│   └── src/
│       ├── components/    Reusable UI components
│       ├── pages/         Route-level pages
│       ├── services/      Axios API clients
│       └── context/       AuthContext
├── infrastructure/
│   └── terraform/         AWS infrastructure (VPC, ALB, ASG, RDS)
│       └── modules/       vpc, security_groups, alb, asg, rds, iam
├── scripts/               Seed data, deployment, init scripts
├── docker-compose.yml     Local PostgreSQL
├── SETUP.md               Complete setup guide
└── README.md              This file
```

## Creating an Admin Account

Admin accounts are never created automatically. After registering a student account:

```powershell
cd backend
flask --app manage:app promote-admin your@email.com
```

## API Documentation

With the backend running: http://localhost:5000/api/health

Key endpoints:
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET /api/floors` — list floors
- `GET /api/availability?floor_id=...&date=...&start_time=...&end_time=...` — seat availability
- `POST /api/bookings` — create booking
- `PATCH /api/bookings/:id/cancel` — cancel booking

## AWS Deployment

See [SETUP.md](SETUP.md) for the full cloud deployment guide.

```powershell
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## License

Academic project — MIT License
