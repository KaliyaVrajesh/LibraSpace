# LibraSpace AWS Deployment Script (PowerShell)
# Builds frontend, packages backend, and deploys to EC2 ASG instances.

param(
    [string]$Environment = "production",
    [string]$Region = "us-east-1",
    [string]$AsgName = "",
    [switch]$SkipBuild = $false,
    [switch]$MigrateOnly = $false
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

function Write-Step {
    param([string]$Message)
    Write-Host "`n=> $Message" -ForegroundColor Cyan
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites"
    $tools = @("aws", "terraform", "python", "node", "npm")
    foreach ($tool in $tools) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Error "$tool is not installed or not in PATH"
            exit 1
        }
    }

    # Verify AWS identity
    $identity = aws sts get-caller-identity --output json 2>&1 | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS CLI is not configured. Run: aws configure"
        exit 1
    }
    Write-Host "  AWS Account: $($identity.Account)" -ForegroundColor Green
    Write-Host "  IAM Identity: $($identity.Arn)" -ForegroundColor Green
}

function Build-Frontend {
    Write-Step "Building React frontend"
    Set-Location "$RootDir\frontend"

    if (-not (Test-Path "node_modules")) {
        npm install
    }

    # Set API URL to use ALB
    $albDns = Get-AsgAlbDns
    if ($albDns) {
        $env:VITE_API_BASE_URL = "http://$albDns/api"
    }

    npm run build
    Write-Host "  Frontend built to frontend/dist/" -ForegroundColor Green
}

function Get-AsgAlbDns {
    try {
        Set-Location "$RootDir\infrastructure\terraform"
        $outputs = terraform output -json 2>$null | ConvertFrom-Json
        return $outputs.alb_dns_name.value
    } catch {
        return $null
    }
}

function Package-Backend {
    Write-Step "Packaging backend"

    $distDir = "$RootDir\dist\app"
    if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
    New-Item -ItemType Directory -Path $distDir | Out-Null

    # Copy backend
    Copy-Item -Recurse "$RootDir\backend\*" "$distDir\backend\" -Exclude @("__pycache__", "*.pyc", ".env*", "tests")

    # Copy frontend build
    if (Test-Path "$RootDir\frontend\dist") {
        Copy-Item -Recurse "$RootDir\frontend\dist" "$distDir\frontend\dist"
    }

    # Copy seed script
    Copy-Item -Recurse "$RootDir\scripts" "$distDir\scripts"

    Write-Host "  Package created at dist/app/" -ForegroundColor Green
}

function Deploy-ToInstances {
    param([string]$AsgGroupName)

    Write-Step "Deploying to ASG instances: $AsgGroupName"

    # Get running instance IDs
    $instances = aws autoscaling describe-auto-scaling-groups `
        --auto-scaling-group-names $AsgGroupName `
        --region $Region `
        --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId" `
        --output text 2>&1

    if ($instances -eq "" -or $null -eq $instances) {
        Write-Warning "No in-service instances found in ASG: $AsgGroupName"
        Write-Host "  The ASG will deploy on next instance launch using user data." -ForegroundColor Yellow
        return
    }

    Write-Host "  Found instances: $instances"

    # Use SSM Run Command to update application
    $instanceList = $instances -split "`t"
    foreach ($instanceId in $instanceList) {
        Write-Host "  Updating instance: $instanceId" -ForegroundColor Yellow
        $commandId = aws ssm send-command `
            --document-name "AWS-RunShellScript" `
            --instance-ids $instanceId `
            --parameters 'commands=["cd /opt/libraspace && git pull && cd backend && pip install -r requirements.txt -q && flask --app manage:app db upgrade && systemctl restart libraspace"]' `
            --region $Region `
            --query "Command.CommandId" `
            --output text

        Write-Host "  SSM Command sent: $commandId"
    }

    Write-Host "  Deployment commands sent. Check AWS Console > Systems Manager > Run Command" -ForegroundColor Green
}

function Start-InstanceRefresh {
    param([string]$AsgGroupName)
    Write-Step "Triggering ASG instance refresh (rolling deployment)"

    aws autoscaling start-instance-refresh `
        --auto-scaling-group-name $AsgGroupName `
        --strategy Rolling `
        --preferences '{"MinHealthyPercentage": 50}' `
        --region $Region

    Write-Host "  Instance refresh started. New instances will pull latest code." -ForegroundColor Green
    Write-Host "  Monitor: aws autoscaling describe-instance-refreshes --auto-scaling-group-name $AsgGroupName --region $Region"
}

# ── Main ──────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Blue
Write-Host " LibraSpace Deployment Script" -ForegroundColor Blue
Write-Host " Environment: $Environment | Region: $Region" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

Test-Prerequisites

if (-not $SkipBuild) {
    Build-Frontend
    Package-Backend
}

# Get ASG name from Terraform if not provided
if (-not $AsgName) {
    Set-Location "$RootDir\infrastructure\terraform"
    try {
        $tfState = terraform show -json 2>$null | ConvertFrom-Json
        $asgResource = $tfState.values.root_module.child_modules | 
            ForEach-Object { $_.resources } | 
            Where-Object { $_.type -eq "aws_autoscaling_group" } |
            Select-Object -First 1
        $AsgName = $asgResource.values.name
    } catch {
        Write-Warning "Could not determine ASG name from Terraform state."
    }
}

if ($AsgName) {
    Deploy-ToInstances -AsgGroupName $AsgName
} else {
    Write-Warning "ASG name not found. Set -AsgName parameter."
}

Write-Host "`n✅ Deployment script complete" -ForegroundColor Green
Write-Host "Run './scripts/verify-deployment.ps1' to check health" -ForegroundColor Cyan
