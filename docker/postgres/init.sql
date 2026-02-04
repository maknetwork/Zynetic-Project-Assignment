-- Initial Database Setup Script
-- Executed on container first start

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set timezone to UTC
SET timezone = 'UTC';

-- Log initialization
\echo 'Fleet Telemetry Database Initialized Successfully'
\echo 'TimescaleDB Extension: Enabled'
\echo 'pg_stat_statements Extension: Enabled'
\echo 'Timezone: UTC'
