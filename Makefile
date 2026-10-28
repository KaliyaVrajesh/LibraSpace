# LibraSpace — Makefile
# Quick command reference for common tasks.
# Run: make <target>
# On Windows, use the PowerShell equivalents shown in SETUP.md

.PHONY: help up down backend frontend migrate seed seed-demo test lint build clean

help:
	@echo "LibraSpace — Available Commands"
	@echo ""
	@echo "  make up          Start PostgreSQL (Docker)"
	@echo "  make down        Stop PostgreSQL"
	@echo "  make migrate     Run database migrations"
	@echo "  make seed        Seed floors and seats"
	@echo "  make seed-demo   Seed floors, seats, AND demo bookings"
	@echo "  make backend     Start Flask backend (port 5000)"
	@echo "  make frontend    Start Vite frontend (port 5173)"
	@echo "  make test        Run backend pytest suite"
	@echo "  make lint        Run Python linters"
	@echo "  make build       Build frontend for production"
	@echo "  make clean       Remove build artifacts"
	@echo ""

up:
	docker-compose up -d postgres
	@echo "PostgreSQL started. Wait ~10s for initialization."

down:
	docker-compose stop postgres

migrate:
	cd backend && flask --app manage:app db upgrade

seed:
	cd backend && flask --app manage:app seed

seed-demo:
	cd backend && flask --app manage:app seed --with-bookings

backend:
	cd backend && python wsgi.py

frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -v

lint:
	cd backend && flake8 app/ --max-line-length=100

build:
	cd frontend && npm run build

clean:
	rm -rf frontend/dist frontend/node_modules
	find backend -name "__pycache__" -type d -exec rm -rf {} +
	find backend -name "*.pyc" -delete
