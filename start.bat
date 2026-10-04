@echo off
chcp 65001 >nul
echo 正在启动思维导图程序...
start "" "http://localhost:8080"
node server.js
pause
