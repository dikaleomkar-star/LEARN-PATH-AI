@echo off
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul
cd /D "C:\Users\kashi\batch14\backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000