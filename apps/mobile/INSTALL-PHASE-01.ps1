$ErrorActionPreference = "Stop"
Write-Host "Support Command Center - Phase 01" -ForegroundColor Cyan
if (-not (Test-Path package.json)) { throw "Run this script from the mobile project folder." }
npm install
npx expo install --fix
npx expo install expo-secure-store
Write-Host "Phase 01 dependencies installed." -ForegroundColor Green
Write-Host "Run: npm start" -ForegroundColor Yellow
