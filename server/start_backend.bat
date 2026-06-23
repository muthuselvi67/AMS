@echo off
cd /d "%~dp0"
echo Starting PHP Development Server on http://0.0.0.0:5000...
C:\xampp\php\php.exe -S 0.0.0.0:5000 router.php
