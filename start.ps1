Write-Host "=== 启动 AI 剧本杀 ===" -ForegroundColor Cyan

# Init config
$configPath = Join-Path $PSScriptRoot "backend\config.toml"
$examplePath = Join-Path $PSScriptRoot "backend\config.example.toml"
if (-not (Test-Path $configPath)) {
    Copy-Item $examplePath $configPath
    Write-Host "[配置] 已从模板创建 config.toml，请编辑后重新运行" -ForegroundColor Yellow
    Write-Host "  $configPath" -ForegroundColor Yellow
    exit 1
}

# 启动后端
$backendJob = Start-Job -Name "Backend" -ScriptBlock {
    Set-Location -LiteralPath "$using:PSScriptRoot\backend"
    bun run src/server.ts
}

Write-Host "[后端] 启动中..." -ForegroundColor Green
Start-Sleep -Seconds 2

# 启动前端
$frontendJob = Start-Job -Name "Frontend" -ScriptBlock {
    Set-Location -LiteralPath "$using:PSScriptRoot\frontend"
    bun run dev
}

Write-Host "[前端] 启动中..." -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  后端: http://localhost:8000" -ForegroundColor Yellow
Write-Host "  前端: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Get-Job | Stop-Job
    Get-Job | Remove-Job
}
