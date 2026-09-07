-- Art Academy Platform - Database Initialization Script
-- Creates all required databases if they do not already exist.
-- This script is executed by the postgres:16-alpine entrypoint
-- when the container is first started (/docker-entrypoint-initdb.d/).

\set ON_ERROR_STOP on

SELECT 'CREATE DATABASE auth_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec

SELECT 'CREATE DATABASE user_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_db')\gexec

SELECT 'CREATE DATABASE academic_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'academic_db')\gexec

SELECT 'CREATE DATABASE attendance_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'attendance_db')\gexec

SELECT 'CREATE DATABASE schedule_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'schedule_db')\gexec

SELECT 'CREATE DATABASE payment_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'payment_db')\gexec

SELECT 'CREATE DATABASE notification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec

SELECT 'CREATE DATABASE reporting_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'reporting_db')\gexec

-- Grant all privileges on each database to the artacademy user
\c auth_db
GRANT ALL PRIVILEGES ON DATABASE auth_db TO artacademy;

\c user_db
GRANT ALL PRIVILEGES ON DATABASE user_db TO artacademy;

\c academic_db
GRANT ALL PRIVILEGES ON DATABASE academic_db TO artacademy;

\c attendance_db
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO artacademy;

\c schedule_db
GRANT ALL PRIVILEGES ON DATABASE schedule_db TO artacademy;

\c payment_db
GRANT ALL PRIVILEGES ON DATABASE payment_db TO artacademy;

\c notification_db
GRANT ALL PRIVILEGES ON DATABASE notification_db TO artacademy;

\c reporting_db
GRANT ALL PRIVILEGES ON DATABASE reporting_db TO artacademy;
