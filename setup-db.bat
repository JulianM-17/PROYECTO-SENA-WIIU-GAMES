@echo off
rem ------------------------------------------------------------
rem  Setup script for WiiU Games project database (MySQL)
rem ------------------------------------------------------------

rem Check if Docker is available
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Docker not found in PATH. Please install Docker Desktop for Windows and ensure "docker" is available.
  exit /b 1
)

rem Pull MySQL image (if not already present)
docker pull mysql:8

rem Run MySQL container
rem -e MYSQL_ROOT_PASSWORD sets root password
rem -e MYSQL_DATABASE creates the database
rem -p maps host port 3306 to container port 3306
rem Use a deterministic container name for easy management

set CONTAINER_NAME=wiiu-mysql

rem Stop and remove any existing container with the same name
docker ps -a --filter "name=%CONTAINER_NAME%" --format "{{.ID}}" | foreach {docker stop $_; docker rm $_}

docker run -d --name %CONTAINER_NAME% ^
  -e MYSQL_ROOT_PASSWORD=Admin123456 ^
  -e MYSQL_DATABASE=wiiu_gamesdb ^
  -p 3306:3306 ^
  mysql:8

rem Wait for MySQL to become ready (max 30 seconds)
set /a retries=30
:waitloop
if %retries% leq 0 (
  echo MySQL container did not become ready in time.
  exit /b 1
)
docker exec %CONTAINER_NAME% mysqladmin ping -h "localhost" --silent
if %ERRORLEVEL% neq 0 (
  timeout /t 1 >nul
  set /a retries-=1
  goto waitloop
)

rem Import schema
docker cp "${PWD}\DB\WiiUGames.sql" %CONTAINER_NAME%:/WiiUGames.sql
docker exec -i %CONTAINER_NAME% mysql -u root -pAdmin123456 wiiu_gamesdb < "${PWD}\DB\WiiUGames.sql"

echo Database setup complete.
exit /b 0
