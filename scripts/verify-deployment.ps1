# LibraSpace Deployment Verification Script

param(
    [string]$AlbDns = "",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=> $Message" -ForegroundColor Cyan
}

function Test-Endpoint {
    param([string]$Url, [string]$Description, [int]$ExpectedStatus = 200)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ $Description ($($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ $Description (unexpected status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ $Description (failed: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Get ALB DNS from Terraform if not provided
if (-not $AlbDns) {
    try {
        Set-Location (Join-Path $PSScriptRoot "..\infrastructure\terraform")
        $AlbDns = terraform output -raw alb_dns_name 2>$null
    } catch {
        Write-Warning "Could not get ALB DNS from Terraform. Provide -AlbDns parameter."
        exit 1
    }
}

Write-Host "=== LibraSpace Deployment Verification ===" -ForegroundColor Blue
Write-Host "ALB: $AlbDns"

Write-Step "Testing application health endpoints"
$baseUrl = "http://$AlbDns"
Test-Endpoint "$baseUrl/api/health" "API Health check"
Test-Endpoint "$baseUrl/api/health/ready" "API Readiness check"

Write-Step "Checking ALB target group health"
$asgName = ""
try {
    $asgName = terraform output -raw -chdir (Join-Path $PSScriptRoot "..\infrastructure\terraform") alb_dns_name 2>$null
} catch {}

Write-Host "`nTo check target group health manually, run:"
Write-Host "  aws elbv2 describe-target-health --target-group-arn <TG_ARN> --region $Region" -ForegroundColor Yellow

Write-Host "`n=== Verification Complete ===" -ForegroundColor Blue
Write-Host "Application URL: http://$AlbDns" -ForegroundColor Green
