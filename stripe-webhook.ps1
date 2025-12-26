# Stripe Webhook Helper Script
# This script sets up the PATH and starts Stripe webhook forwarding

# Add Stripe CLI to PATH for this session
$stripePath = "$env:USERPROFILE\AppData\Local\Programs\stripe"
if (Test-Path "$stripePath\stripe.exe") {
    $env:PATH += ";$stripePath"
    Write-Host "Stripe CLI found at: $stripePath" -ForegroundColor Green
    
    # Start webhook forwarding
    Write-Host "`nStarting Stripe webhook forwarding..." -ForegroundColor Yellow
    Write-Host "Make sure your Next.js dev server is running on http://localhost:3000" -ForegroundColor Yellow
    Write-Host "`nCopy the webhook signing secret (whsec_...) and add it to your .env.local file`n" -ForegroundColor Cyan
    
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
} else {
    Write-Host "Stripe CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Expected location: $stripePath\stripe.exe" -ForegroundColor Red
}



