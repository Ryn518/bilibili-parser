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
echo  正在启动本地服务，浏览器将自动打开...
echo  地址: http://127.0.0.1:3000
echo  关闭本窗口即停止服务
echo.

REM 若 3000 端口被旧进程占用，先结束它（否则会用旧版服务，登录会失败）
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

node server.js
