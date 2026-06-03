Write-Host "=== 启动 AI 剧本杀 ===" -ForegroundColor Cyan

# 启动后端
$backendJob = Start-Job -Name "Backend" -ScriptBlock {
    Set-Location -LiteralPath "$using:PSScriptRoot\backend"
    python -m uvicorn main:app --host 0.0.0.0 --port 8000
}

Write-Host "[后端] 启动中..." -ForegroundColor Green
Start-Sleep -Seconds 2

# 启动前端
$frontendJob = Start-Job -Name "Frontend" -ScriptBlock {
    Set-Location -LiteralPath "$using:PSScriptRoot\frontend"
    npm run dev
}

Write-Host "[前端] 启动中..." -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  后端: http://localhost:8000" -ForegroundColor Yellow
Write-Host "  前端: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# 等待子进程
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Get-Job | Stop-Job
    Get-Job | Remove-Job
}
