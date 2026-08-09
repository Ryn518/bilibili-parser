@echo off
chcp 65001 >nul
cd /d "%~dp0"
title B站课表规划器

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [错误] 未检测到 Node.js
  echo  请先安装: https://nodejs.org/  （选 LTS 版本）
  echo.
  pause
  exit /b 1
)

echo.
echo  正在启动 Next.js 开发服务...
echo  地址: http://127.0.0.1:3000
echo  关闭本窗口即停止服务
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

if not exist node_modules (
  echo  首次运行，正在安装依赖...
  call npm install
)

start "" "http://127.0.0.1:3000"
call npm run dev
