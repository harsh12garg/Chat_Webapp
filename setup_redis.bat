@echo off
echo Setting up Redis for Windows...

:: Create a directory for Redis
if not exist "redis" mkdir redis
cd redis

:: Download Redis for Windows
echo Downloading Redis for Windows...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip' -OutFile 'redis.zip'"

:: Extract the ZIP file
echo Extracting Redis...
powershell -Command "Expand-Archive -Path 'redis.zip' -DestinationPath '.' -Force"

:: Start Redis server
echo Starting Redis server...
start "" redis-server.exe

echo Redis setup complete!
echo Redis is now running on localhost:6379
echo.
echo To stop Redis, close the Redis server window or run: redis-cli.exe shutdown
echo To connect to Redis, run: redis-cli.exe
echo.
echo Press any key to exit...
pause > nul 