-- Art Academy Platform - Database Initialization Script
-- Creates all required databases if they do not already exist.
-- This script is executed by the postgres:16-alpine entrypoint
-- when the container is first started (/docker-entrypoint-initdb.d/).

\set ON_ERROR_STOP on

SELECT 'CREATE DATABASE auth_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec

SELECT 'CREATE DATABASE academic_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'academic_db')\gexec

SELECT 'CREATE DATABASE notification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec

SELECT 'CREATE DATABASE reporting_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'reporting_db')\gexec

-- Grant all privileges on each database to the artacademy user
\c auth_db
GRANT ALL PRIVILEGES ON DATABASE auth_db TO artacademy;

\c academic_db
GRANT ALL PRIVILEGES ON DATABASE academic_db TO artacademy;

\c notification_db
GRANT ALL PRIVILEGES ON DATABASE notification_db TO artacademy;

\c reporting_db
GRANT ALL PRIVILEGES ON DATABASE reporting_db TO artacademy;
