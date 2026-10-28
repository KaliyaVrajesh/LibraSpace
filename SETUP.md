# LibraSpace — Complete Setup Guide

This guide walks you through every step to run LibraSpace locally and deploy it to AWS. It assumes basic Python and web development knowledge but limited AWS experience.

All PowerShell commands are written for Windows 10/11. Run PowerShell as a regular user unless a step specifically requires administrator privileges.

---

## Table of Contents

1. [Project Overview and Architecture](#1-project-overview-and-architecture)
2. [Prerequisites and Installation](#2-prerequisites-and-installation)
3. [Verify Installations](#3-verify-installations)
4. [Open the Project](#4-open-the-project)
5. [Local Environment Configuration](#5-local-environment-configuration)
6. [Start PostgreSQL](#6-start-postgresql)
7. [Install Backend Dependencies](#7-install-backend-dependencies)
8. [Install Frontend Dependencies](#8-install-frontend-dependencies)
9. [Run Database Migrations](#9-run-database-migrations)
10. [Seed Sample Data](#10-seed-sample-data)
11. [Create an Administrator Account](#11-create-an-administrator-account)
12. [Start the Backend](#12-start-the-backend)
13. [Start the Frontend](#13-start-the-frontend)
14. [Local URLs Reference](#14-local-urls-reference)
15. [Test the Application](#15-test-the-application)
16. [Run Automated Tests](#16-run-automated-tests)
17. [AWS Account Setup](#17-aws-account-setup)
18. [Configure AWS CLI](#18-configure-aws-cli)
19. [Configure Terraform Variables](#19-configure-terraform-variables)
20. [Review the Infrastructure Plan](#20-review-the-infrastructure-plan)
21. [Deploy AWS Infrastructure](#21-deploy-aws-infrastructure)
22. [Deploy the Application to EC2](#22-deploy-the-application-to-ec2)
23. [Verify the Deployment](#23-verify-the-deployment)
24. [Find the ALB DNS Name](#24-find-the-alb-dns-name)
25. [Inspect CloudWatch Logs](#25-inspect-cloudwatch-logs)
26. [Troubleshoot Common Issues](#26-troubleshoot-common-issues)
27. [Update the Application](#27-update-the-application)
28. [Enable HTTPS](#28-enable-https)
29. [Destroy AWS Resources](#29-destroy-aws-resources)
30. [Troubleshooting Checklist](#30-troubleshooting-checklist)

---

## 1. Project Overview and Architecture

LibraSpace is a seat booking system for a university library. It has three layers:

**Frontend** — React TypeScript single-page application. Runs on port 5173 locally, served via Flask in production.

**Backend** — Python Flask REST API. Runs on port 5000. Uses PostgreSQL via SQLAlchemy ORM and JWT Bearer token authentication.

**Database** — PostgreSQL. Runs in Docker locally and in Amazon RDS in production.

**AWS Architecture:**
```
Internet → Application Load Balancer (public subnets, 2 AZs)
                    ↓
         EC2 Auto Scaling Group (private app subnets, 2 AZs)
         Flask + Gunicorn, 4 workers per instance
                    ↓
         Amazon RDS PostgreSQL (private db subnets, 2 AZs)
```

AWS Secrets Manager stores the database password and is accessed by EC2 instances via an IAM role — no AWS credentials or passwords are stored in application code or environment files on EC2.

---

## 2. Prerequisites and Installation

Install the following tools. Click each link for the official download page.

### Python 3.12+

1. Download Python 3.12 from https://www.python.org/downloads/windows/
2. **Important:** During installation, check **"Add Python to PATH"**
3. Choose **"Customize installation"** and check **"pip"** and **"py launcher"**

Verify:
```powershell
python --version
pip --version
```

### Node.js 20 LTS

1. Download from https://nodejs.org/ — choose the **LTS** version
2. Run the installer with default settings

Verify:
```powershell
node --version
npm --version
```

### Docker Desktop

Docker Desktop provides the PostgreSQL container used in local development.

1. Download from https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Open Docker Desktop and wait for the whale icon in the system tray to stop animating

Verify:
```powershell
docker --version
docker-compose --version
```

### Git

Download from https://git-scm.com/download/win and install with default settings.

```powershell
git --version
```

### Terraform

1. Download the Windows AMD64 zip from https://developer.hashicorp.com/terraform/downloads
2. Extract `terraform.exe`
3. Create a folder `C:\tools` and move `terraform.exe` there
4. Add `C:\tools` to your PATH:
   - Search Windows for **"Edit the system environment variables"**
   - Click **Environment Variables**
   - Under **User variables**, select **Path** → **Edit** → **New** → `C:\tools`
   - Click OK on all dialogs

```powershell
terraform --version
```

### AWS CLI

1. Download the MSI installer from https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
2. Run the installer

```powershell
aws --version
```

---

## 3. Verify Installations

Run this block to confirm everything is installed:

```powershell
python --version   # Should show 3.12.x or later
pip --version
node --version     # Should show 20.x or later
npm --version
docker --version
docker-compose --version
git --version
terraform --version  # Should show 1.5.x or later
aws --version
```

If any command is not found, revisit the installation for that tool.

---

## 4. Open the Project

The project is already in `c:\LibraSpace`. Open a PowerShell terminal and navigate there:

```powershell
cd c:\LibraSpace
```

Verify the structure:
```powershell
Get-ChildItem
```

You should see: `backend/`, `frontend/`, `infrastructure/`, `scripts/`, `docker-compose.yml`, `SETUP.md`, `README.md`.

---

## 5. Local Environment Configuration

### Backend environment

```powershell
cd c:\LibraSpace\backend
Copy-Item .env.example .env
```

Open `.env` in any text editor and generate secure random keys:

```powershell
# Generate SECRET_KEY
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

Copy the output and paste the values into `.env`, replacing `REPLACE_WITH_RANDOM_SECRET_KEY_32_CHARS` and `REPLACE_WITH_RANDOM_JWT_SECRET_KEY_32_CHARS`.

The default database URL in `.env` is already correct for the Docker Compose setup:
```
DATABASE_URL=postgresql://libraspace:libraspace_dev_pass@localhost:5432/libraspace_dev
```

**Environment variable reference:**

| Variable | Description |
|----------|-------------|
| `FLASK_ENV` | `development`, `testing`, or `production` |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database used only during `pytest` |
| `SECRET_KEY` | Flask session secret (generate a random 32+ char string) |
| `JWT_SECRET_KEY` | JWT signing secret (generate a random 32+ char string) |
| `LIBRARY_TIMEZONE` | Timezone for date/time display, e.g. `Asia/Kolkata` |
| `LIBRARY_OPEN_HOUR` | Library opening hour (24h), default `8` |
| `LIBRARY_CLOSE_HOUR` | Library closing hour (24h), default `22` |
| `MAX_BOOKING_HOURS` | Maximum booking duration in hours, default `4` |
| `MIN_BOOKING_MINUTES` | Minimum booking duration in minutes, default `30` |

### Frontend environment

```powershell
cd c:\LibraSpace\frontend
Copy-Item .env.example .env
```

The default frontend `.env` needs no changes for local development. The Vite development server proxies `/api` requests to `http://localhost:5000`.

---

## 6. Start PostgreSQL

```powershell
cd c:\LibraSpace
docker-compose up -d postgres
```

Wait about 10 seconds for PostgreSQL to initialize, then verify it is running:

```powershell
docker ps
```

You should see `libraspace_postgres` with status `Up`. The container creates two databases:
- `libraspace_dev` — used by the application
- `libraspace_test` — used only by pytest

Stop it later with: `docker-compose stop postgres`

---

## 7. Install Backend Dependencies

```powershell
cd c:\LibraSpace\backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

If you see a policy error on `Activate.ps1`, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try activating again.

Expected output: pip will install Flask, SQLAlchemy, Flask-JWT-Extended, argon2-cffi, and other dependencies.

---

## 8. Install Frontend Dependencies

Open a **new** PowerShell terminal (keep the backend terminal open):

```powershell
cd c:\LibraSpace\frontend
npm install
```

This downloads all React, Tailwind, and chart library dependencies.

---

## 9. Run Database Migrations

In the backend terminal (with virtual environment activated):

```powershell
cd c:\LibraSpace\backend

# Make sure .env is loaded
$env:FLASK_ENV = "development"
$env:FLASK_APP = "manage:app"

# Apply all migrations
flask --app manage:app db upgrade
```

Expected output: Alembic will run the initial migration and create all tables (users, floors, seats, bookings, token_blocklist).

Verify:
```powershell
# Optional: connect to the database and list tables
docker exec -it libraspace_postgres psql -U libraspace -d libraspace_dev -c "\dt"
```

You should see 5 tables listed.

---

## 10. Seed Sample Data

This creates 4 floors with approximately 24 seats each. The `--with-bookings` flag also creates demo user accounts and sample bookings.

```powershell
cd c:\LibraSpace\backend

# Seed floors and seats only
flask --app manage:app seed

# OR: Seed floors, seats, AND sample bookings + demo users
flask --app manage:app seed --with-bookings
```

**Important:** The `--with-bookings` flag creates demo accounts with known passwords (`Demo1234!`). Do not use this flag in a real production environment without removing those accounts afterward.

---

## 11. Create an Administrator Account

Admin accounts are never created automatically. This is a security requirement — there is no default admin with a known password.

**Step 1:** Register a user account through the web interface (see section 13 to start the app first) or via the API:

```powershell
# Register a user via the API
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"full_name":"Admin User","email":"admin@yourdomain.com","password":"Admin1234","confirm_password":"Admin1234"}'
```

**Step 2:** Promote the user to admin using the Flask CLI:

```powershell
cd c:\LibraSpace\backend
flask --app manage:app promote-admin admin@yourdomain.com
```

Expected output:
```
Success: 'Admin User' (admin@yourdomain.com) has been promoted to admin.
```

To see all users:
```powershell
flask --app manage:app list-users
```

---

## 12. Start the Backend

In the backend terminal (virtual environment activated):

```powershell
cd c:\LibraSpace\backend
$env:FLASK_ENV = "development"
python wsgi.py
```

Expected output:
```
 * Serving Flask app
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

The backend restarts automatically when you change Python files (debug mode).

---

## 13. Start the Frontend

In the frontend terminal:

```powershell
cd c:\LibraSpace\frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in 800ms
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

---

## 14. Local URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:5000 | Flask REST API |
| Health check | http://localhost:5000/api/health | Liveness probe |
| Readiness | http://localhost:5000/api/health/ready | DB connectivity check |
| API base | http://localhost:5000/api | All API endpoints |

---

## 15. Test the Application

### Complete booking workflow

1. Open http://localhost:5173
2. Click **Get Started** and register a student account
3. Log in — you'll see the Student Dashboard
4. Click **Book a Seat**
5. Select a floor from the dropdown
6. Choose a future date and time slot (e.g., tomorrow, 10:00–12:00)
7. Click an available (green) seat on the map
8. Click **Confirm Booking** in the sidebar panel
9. Review the summary and click **Book Seat**
10. You'll see a success banner with your booking reference

### View and cancel bookings

1. Click **My Bookings** in the navigation
2. Your confirmed booking appears in the list
3. Click **Cancel** (X icon) next to a future booking
4. Confirm cancellation — status changes to Cancelled

### Admin features

After promoting a user to admin (section 11):

1. Log in with your admin account
2. You're automatically redirected to the Admin Dashboard
3. See booking trends, utilization, and recent bookings
4. Navigate to **Floors & Seats** to create, edit, or deactivate seats
5. Navigate to **Bookings** to see all student bookings and cancel them if needed

### Test seat availability enforcement

1. Log in as Student A, book seat G01 for tomorrow 10:00–12:00
2. Open a private/incognito browser tab and log in as Student B
3. Try to book the same seat (G01) for the same time
4. Student B should receive: *"Seat G01 is already booked from 10:00 to 12:00"*

---

## 16. Run Automated Tests

Make sure PostgreSQL is running (section 6) and the test database exists.

```powershell
cd c:\LibraSpace\backend

# Activate virtual environment if not already active
.\venv\Scripts\Activate.ps1

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_auth.py -v

# Run a specific test
pytest tests/test_bookings.py::TestOverlapPrevention::test_overlapping_booking_rejected -v
```

Tests use an isolated `libraspace_test` database and roll back all changes after each test. They do not affect your development database.

Expected result: all tests pass (some may require the test database to be initialized — migrations run automatically).

---

## 17. AWS Account Setup

### Create or use an AWS account

1. Go to https://aws.amazon.com/ and create a free-tier account or log in
2. Go to IAM → Users → Create user
3. Give it a name like `libraspace-deployer`
4. Attach the policy **AdministratorAccess** (sufficient for initial setup — restrict later for production)
5. Under **Security credentials**, create an **Access key** (CLI access type)
6. Download or note the **Access Key ID** and **Secret Access Key**

**Cost warning:** This project creates billable AWS resources. Estimated cost for a minimal demo (1 t3.micro EC2, 1 db.t3.micro RDS, 1 ALB) is approximately $1–5 USD per day depending on traffic. Always destroy resources when not in use (section 29).

---

## 18. Configure AWS CLI

```powershell
aws configure
```

Enter when prompted:
- **AWS Access Key ID**: your key ID from section 17
- **AWS Secret Access Key**: your secret key
- **Default region name**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

Verify:
```powershell
aws sts get-caller-identity
```

Expected output (showing your account ID and username):
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/libraspace-deployer"
}
```

---

## 19. Configure Terraform Variables

```powershell
cd c:\LibraSpace\infrastructure\terraform
Copy-Item terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` in a text editor and fill in the values:

**Required: AMI ID**

Get the latest Amazon Linux 2023 AMI ID for your region:

```powershell
aws ec2 describe-images `
    --owners amazon `
    --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" `
    --query "sort_by(Images,&CreationDate)[-1].ImageId" `
    --output text `
    --region us-east-1
```

Copy the output (e.g., `ami-0abcdef1234567890`) and paste it as `ami_id` in `terraform.tfvars`.

**terraform.tfvars example (fill in your values):**

```hcl
aws_region   = "us-east-1"
project_name = "libraspace"
environment  = "production"

ami_id        = "ami-REPLACE_WITH_ACTUAL_AMI"
instance_type = "t3.micro"

min_capacity     = 1
desired_capacity = 1
max_capacity     = 2

db_instance_class = "db.t3.micro"
db_storage_gb     = 20
app_port          = 5000
```

**Never commit `terraform.tfvars` to version control** — it may contain sensitive values.

---

## 20. Review the Infrastructure Plan

```powershell
cd c:\LibraSpace\infrastructure\terraform

# Initialize providers and modules
terraform init

# Validate configuration
terraform validate

# Format check
terraform fmt -check -recursive

# Preview what will be created (no changes made yet)
terraform plan
```

Review the plan output carefully. You should see resources being created for:
- 1 VPC with 6 subnets (2 public, 2 app, 2 db)
- 1 Internet Gateway
- 1 Application Load Balancer
- 1 Target Group
- 1 Launch Template
- 1 Auto Scaling Group
- 1 RDS PostgreSQL instance
- 3 Security Groups
- 1 Secrets Manager secret
- 1 IAM Role + Instance Profile
- 4 VPC Interface Endpoints
- CloudWatch alarms and log group

**Important:** Review the plan output before applying. Confirm no unexpected resources are shown.

---

## 21. Deploy AWS Infrastructure

**This step creates real AWS resources and will incur charges.**

```powershell
cd c:\LibraSpace\infrastructure\terraform
terraform apply
```

Type `yes` when prompted. Terraform will create all resources.

This takes approximately 15–20 minutes. The RDS instance takes the longest.

When complete, Terraform prints:
```
Apply complete! Resources: XX added.

Outputs:

alb_dns_name = "libraspace-production-alb-XXXXXXXX.us-east-1.elb.amazonaws.com"
alb_url      = "http://libraspace-production-alb-XXXXXXXX.us-east-1.elb.amazonaws.com"
```

Save the ALB DNS name — you'll need it to access the application.

**Inspect what was created:**
```powershell
terraform show
terraform output
```

---

## 22. Deploy the Application to EC2

The EC2 instances are in private subnets (no public IP). To deploy code, you have two options:

### Option A: SSM Session Manager (recommended — no SSH needed)

AWS Systems Manager Session Manager lets you access instances through the AWS Console or CLI without opening SSH ports.

1. Go to AWS Console → EC2 → Instances
2. Select a running instance
3. Click **Connect** → **Session Manager** → **Connect**
4. This opens a terminal session

From within the instance, deploy the application:

```bash
# On the EC2 instance via SSM
sudo -u libraspace mkdir -p /opt/libraspace
cd /opt/libraspace

# Clone your repository (or copy from S3 — see below)
# For demo, we'll use a simplified direct approach:
sudo aws s3 cp s3://your-bucket/libraspace.tar.gz /tmp/app.tar.gz
sudo tar -xzf /tmp/app.tar.gz -C /opt/libraspace/

# Install dependencies
cd /opt/libraspace/backend
sudo pip3.12 install -r requirements.txt

# Run migrations
export FLASK_ENV=production
export DB_SECRET_ARN=$(cat /opt/libraspace/backend/.env.production | grep DB_SECRET_ARN | cut -d= -f2)
flask --app manage:app db upgrade

# Start the service
sudo systemctl restart libraspace
```

### Option B: S3 Artifact Deployment

Package the application and upload to S3:

```powershell
# On your local machine
cd c:\LibraSpace

# Build frontend
cd frontend; npm run build; cd ..

# Create deployment package
Compress-Archive -Path backend, frontend\dist, scripts -DestinationPath libraspace-app.zip

# Upload to S3 (create bucket first if needed)
aws s3 cp libraspace-app.zip s3://your-bucket-name/

# Trigger instance refresh (rolling deployment — replaces instances with new ones)
$asgName = (terraform -chdir="infrastructure\terraform" output -raw asg_name 2>$null)
aws autoscaling start-instance-refresh `
    --auto-scaling-group-name $asgName `
    --region us-east-1 `
    --strategy Rolling
```

### Verifying the service is running (on the EC2 instance):

```bash
sudo systemctl status libraspace
sudo journalctl -u libraspace -n 50 --no-pager
```

---

## 23. Verify EC2 Instance Health and ALB Target Health

### Check ALB target group health

```powershell
# Get the target group ARN
$tgArn = aws elbv2 describe-target-groups `
    --names "libraspace-production-tg" `
    --region us-east-1 `
    --query "TargetGroups[0].TargetGroupArn" `
    --output text

# Check target health
aws elbv2 describe-target-health `
    --target-group-arn $tgArn `
    --region us-east-1
```

Expected: `"State": "healthy"` for each registered instance.

If state is `unhealthy`, check:
1. The application is running: `systemctl status libraspace`
2. The health check path responds: `curl http://localhost:5000/api/health`
3. The security group allows ALB → EC2 on port 5000

### Test the ALB endpoint

```powershell
$albDns = terraform -chdir="c:\LibraSpace\infrastructure\terraform" output -raw alb_dns_name
Invoke-RestMethod "http://$albDns/api/health"
```

Expected:
```json
{"service": "LibraSpace API", "status": "healthy", "timestamp": "..."}
```

---

## 24. Find the ALB DNS Name

```powershell
cd c:\LibraSpace\infrastructure\terraform
terraform output alb_dns_name
```

The application is accessible at: `http://<ALB_DNS_NAME>`

**Note:** The ALB DNS name is long and not memorable. For a real deployment, create a friendly DNS record (CNAME) pointing to the ALB DNS name using Route 53 or your DNS provider.

---

## 25. Inspect CloudWatch Logs

Application logs are sent to CloudWatch automatically.

```powershell
# List log groups
aws logs describe-log-groups `
    --log-group-name-prefix "/libraspace" `
    --region us-east-1

# Get recent logs (last 30 minutes)
aws logs filter-log-events `
    --log-group-name "/libraspace/production/app" `
    --start-time (([DateTimeOffset]::UtcNow.AddMinutes(-30)).ToUnixTimeMilliseconds()) `
    --region us-east-1 `
    --query "events[*].message" `
    --output text
```

Or in the AWS Console: CloudWatch → Log groups → `/libraspace/production/app`

---

## 26. Troubleshoot Common Issues

### "ModuleNotFoundError" when starting backend

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### "could not connect to server" (database connection failed)

```powershell
# Is Docker running?
docker ps

# Is postgres healthy?
docker-compose ps

# Restart it
docker-compose restart postgres

# Wait 10 seconds, then retry
```

### JWT token errors in the browser

Clear `localStorage` in browser developer tools (Application → Local Storage → Clear All), then log in again.

### "sqlalchemy.exc.IntegrityError" when seeding

The data already exists. Either drop and recreate tables:

```powershell
# WARNING: This deletes all data
flask --app manage:app db downgrade base
flask --app manage:app db upgrade
flask --app manage:app seed --with-bookings
```

### "FORBIDDEN" when accessing admin pages

Make sure your account has been promoted:

```powershell
flask --app manage:app list-users
flask --app manage:app promote-admin your@email.com
```

Then log out and log back in to get a fresh JWT token.

### Port already in use

```powershell
# Find what is using port 5000
netstat -ano | Select-String ":5000"
# Kill the process by PID
Stop-Process -Id <PID>
```

### ALB health check failing

1. Check the security group allows port 5000 from the ALB security group
2. Verify the app is running: `systemctl status libraspace`
3. Check the health check path: `curl http://localhost:5000/api/health` from the EC2 instance
4. Review ALB target health in the AWS Console

### RDS connectivity from EC2

RDS is in private subnets and only accessible from the app security group. It is never publicly accessible — this is intentional.

To test connectivity from the EC2 instance:

```bash
# On EC2 instance via SSM
python3 -c "import psycopg2; psycopg2.connect('postgresql://libraspace:PASSWORD@RDS_ENDPOINT:5432/libraspace'); print('Connected!')"
```

Get the RDS endpoint:
```powershell
aws rds describe-db-instances `
    --query "DBInstances[?DBName=='libraspace'].Endpoint.Address" `
    --output text `
    --region us-east-1
```

---

## 27. Update the Application

After making code changes locally, deploy them to the running ASG:

### Rolling update (no downtime)

```powershell
# Build frontend (if changed)
cd c:\LibraSpace\frontend
npm run build

# Package and upload to S3 (if using S3 deployment)
cd c:\LibraSpace
Compress-Archive -Force -Path backend, frontend\dist, scripts -DestinationPath libraspace-app.zip
aws s3 cp libraspace-app.zip s3://your-bucket/

# Start rolling instance refresh
$asgName = "libraspace-production-asg"  # From terraform output
aws autoscaling start-instance-refresh `
    --auto-scaling-group-name $asgName `
    --region us-east-1 `
    --strategy Rolling `
    --preferences '{"MinHealthyPercentage": 50}'
```

The ASG replaces instances one at a time. The ALB continues serving traffic from healthy instances during the refresh. A new instance launches with the updated user_data script.

Monitor the refresh:
```powershell
aws autoscaling describe-instance-refreshes `
    --auto-scaling-group-name $asgName `
    --region us-east-1
```

### How application updates propagate

When you start an instance refresh, the ASG:
1. Launches a new EC2 instance using the current launch template
2. The new instance runs the `user_data.sh` bootstrap script
3. The script installs dependencies and starts the application
4. The ALB health check confirms the new instance is healthy
5. The ALB starts routing traffic to the new instance
6. The ASG terminates the old instance
7. This repeats until all instances are refreshed

For the update to include code changes, those changes must be present in the source the bootstrap script downloads (S3 artifact or Git repository).

---

## 28. Enable HTTPS

HTTPS requires a domain name and an ACM certificate.

### Step 1: Request an ACM certificate

```powershell
# Request a certificate (must be in us-east-1 for ALB)
aws acm request-certificate `
    --domain-name yourdomain.com `
    --subject-alternative-names "*.yourdomain.com" `
    --validation-method DNS `
    --region us-east-1
```

Follow the DNS validation instructions in the ACM console.

### Step 2: Get the certificate ARN

```powershell
aws acm list-certificates --region us-east-1
```

### Step 3: Update terraform.tfvars

```hcl
certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"
```

### Step 4: Apply changes

```powershell
cd c:\LibraSpace\infrastructure\terraform
terraform apply
```

Terraform adds an HTTPS listener and redirects HTTP to HTTPS.

### Step 5: Create DNS record

Point your domain name to the ALB DNS name using a CNAME record in your DNS provider (or Route 53 Alias record).

---

## 29. Destroy AWS Resources

When you no longer need the demo infrastructure, destroy it to stop incurring charges.

**Warning: This permanently deletes all AWS resources including the RDS database and its data.**

```powershell
cd c:\LibraSpace\infrastructure\terraform
terraform destroy
```

Type `yes` when prompted. This takes 10–15 minutes.

### Confirm all billable resources are removed

After destroying, verify in the AWS Console:

```powershell
# Check for remaining EC2 instances
aws ec2 describe-instances `
    --filters "Name=tag:Project,Values=libraspace" "Name=instance-state-name,Values=running,stopped,stopping" `
    --query "Reservations[*].Instances[*].InstanceId" `
    --output text `
    --region us-east-1

# Check for remaining RDS instances
aws rds describe-db-instances `
    --query "DBInstances[?contains(DBInstanceIdentifier,'libraspace')].DBInstanceIdentifier" `
    --output text `
    --region us-east-1

# Check for remaining load balancers
aws elbv2 describe-load-balancers `
    --query "LoadBalancers[?contains(LoadBalancerName,'libraspace')].LoadBalancerArn" `
    --output text `
    --region us-east-1

# Check for secrets (delete manually if needed)
aws secretsmanager list-secrets `
    --filters Key=name,Values=libraspace `
    --region us-east-1 `
    --query "SecretList[*].Name"
```

Secrets Manager secrets have a 7-day recovery window. To force-delete immediately:
```powershell
aws secretsmanager delete-secret `
    --secret-id "YOUR_SECRET_ARN" `
    --force-delete-without-recovery `
    --region us-east-1
```

**Local Docker resources (not AWS):**
```powershell
cd c:\LibraSpace
docker-compose down -v   # Removes containers and the postgres volume
```

---

## 30. Troubleshooting Checklist

Before asking for help, check:

**Local development:**
- [ ] Docker Desktop is running (whale icon in system tray)
- [ ] `docker ps` shows `libraspace_postgres` as `Up`
- [ ] Virtual environment is activated (`.\venv\Scripts\Activate.ps1`)
- [ ] `.env` file exists in `backend/` and has real SECRET_KEY and JWT_SECRET_KEY values
- [ ] Migrations have been applied (`flask --app manage:app db upgrade`)
- [ ] Backend is running on port 5000 (check terminal output)
- [ ] Frontend is running on port 5173 (check terminal output)
- [ ] Browser console shows no CORS errors (they would show in the Network tab)

**Authentication:**
- [ ] Logging in returns a 200 response with `access_token`
- [ ] The token is stored in `localStorage` (check browser → F12 → Application → Local Storage)
- [ ] Admin pages require the user to have `role: admin` — check with `flask --app manage:app list-users`

**AWS deployment:**
- [ ] `aws sts get-caller-identity` returns your account info
- [ ] `terraform.tfvars` has a valid AMI ID for your region
- [ ] `terraform apply` completed without errors
- [ ] EC2 instances show as `InService` in the ASG
- [ ] ALB target group shows instances as `healthy`
- [ ] The `libraspace` systemd service is running on the EC2 instances
- [ ] CloudWatch log group `/libraspace/production/app` has recent entries
- [ ] RDS instance is in `available` state

---

*This guide is complete. You should be able to run LibraSpace locally by following sections 2–15, and deploy it to AWS by following sections 17–24.*
