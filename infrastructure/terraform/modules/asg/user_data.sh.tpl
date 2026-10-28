#!/bin/bash
# LibraSpace EC2 Bootstrap Script (Amazon Linux 2023)
# This script runs once when a new EC2 instance is launched.
# Subsequent updates are handled by instance refresh in the ASG.

set -euo pipefail
exec > >(tee /var/log/libraspace-bootstrap.log) 2>&1

echo "=== LibraSpace Bootstrap Starting ==="
echo "Timestamp: $(date -u)"

# ── System Updates ────────────────────────────────────────────
dnf update -y
dnf install -y python3.12 python3.12-pip git amazon-cloudwatch-agent

# ── App Directory ─────────────────────────────────────────────
APP_DIR="/opt/libraspace"
APP_USER="libraspace"

if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d "$APP_DIR" -s /sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR"

# ── Fetch application code ────────────────────────────────────
# In production, replace this section with your deployment mechanism:
# Option 1: Clone from a private Git repository (using CodeCommit or a deploy key)
# Option 2: Download a versioned artifact from S3
# Option 3: Use AWS CodeDeploy
#
# For this demonstration, the code must already be present at /opt/libraspace.
# Use the deploy.sh script to place it there.

# ── Install Python dependencies ───────────────────────────────
if [ -f "$APP_DIR/backend/requirements.txt" ]; then
    cd "$APP_DIR/backend"
    python3.12 -m pip install --upgrade pip
    python3.12 -m pip install -r requirements.txt
fi

# ── Write systemd service ──────────────────────────────────────
cat > /etc/systemd/system/libraspace.service << 'SYSTEMD_EOF'
[Unit]
Description=LibraSpace Flask Application
After=network.target

[Service]
Type=simple
User=libraspace
WorkingDirectory=/opt/libraspace/backend
EnvironmentFile=/opt/libraspace/backend/.env.production
ExecStart=/usr/local/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --timeout 60 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --bind 0.0.0.0:${app_port} \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    wsgi:app
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=libraspace

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# ── Write production environment file ────────────────────────
cat > "$APP_DIR/backend/.env.production" << ENVEOF
FLASK_ENV=production
LOG_LEVEL=INFO
PORT=${app_port}
AWS_DEFAULT_REGION=${aws_region}
DB_SECRET_ARN=${db_secret_arn}
APP_SECRET_NAME=${project_name}-${environment}/app-secrets
ENVEOF

chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env.production"
chmod 600 "$APP_DIR/backend/.env.production"

# ── Run database migrations ───────────────────────────────────
# Only run on the first instance to avoid concurrent migration issues.
# Use a leader election or SSM Parameter Store for production.
if [ -f "$APP_DIR/backend/wsgi.py" ]; then
    cd "$APP_DIR/backend"
    su -s /bin/bash "$APP_USER" -c "
        export FLASK_ENV=production
        export AWS_DEFAULT_REGION=${aws_region}
        export DB_SECRET_ARN=${db_secret_arn}
        flask --app manage:app db upgrade
    " || echo "Migration failed — check database connectivity"
fi

# ── Start and enable service ──────────────────────────────────
systemctl daemon-reload
systemctl enable libraspace
systemctl start libraspace

# ── CloudWatch Agent ──────────────────────────────────────────
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_EOF'
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/libraspace-bootstrap.log",
                        "log_group_name": "/libraspace/${environment}/bootstrap",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    }
}
CW_EOF

systemctl start amazon-cloudwatch-agent
systemctl enable amazon-cloudwatch-agent

echo "=== LibraSpace Bootstrap Complete ==="
echo "Service status: $(systemctl is-active libraspace)"
