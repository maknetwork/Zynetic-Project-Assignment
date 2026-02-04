# Fleet Telemetry Platform - Setup Verification

This document helps you verify that the implementation is complete and working correctly.

## 📋 Pre-Flight Checklist

### File Structure Verification

Run this command to verify all essential files exist:

```bash
ls -la \
  README.md \
  package.json \
  docker-compose.yml \
  Dockerfile \
  .env.example \
  setup.sh
```

**Expected output:** All files should exist

### Source Code Verification

```bash
# Check module structure
ls -la src/modules/telemetry/
ls -la src/modules/analytics/
ls -la src/modules/database/

# Check entities (5 total)
ls -la src/modules/telemetry/entities/

# Check migrations (4 total)
ls -la src/modules/database/migrations/
```

**Expected:**
- ✅ 3 main modules (telemetry, analytics, database)
- ✅ 5 entity files
- ✅ 4 migration files

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
npm install
```

**Expected output:** 
- No errors
- ~766 packages installed
- May see deprecation warnings (safe to ignore)

### Step 2: Create Environment File

```bash
cp .env.example .env
```

**Expected output:**
- `.env` file created
- Review and update if needed (defaults work for Docker)

### Step 3: Start Docker Services

```bash
docker-compose up -d
```

**Expected output:**
```
Creating network "assign_fleet-network" with driver "bridge"
Creating volume "assign_postgres_data" with local driver
Creating fleet-postgres ... done
Creating fleet-app      ... done
```

**Verify services:**
```bash
docker-compose ps
```

Should show:
- fleet-postgres: Up (healthy)
- fleet-app: Up (healthy)

### Step 4: Check Database

```bash
docker-compose exec postgres pg_isready -U fleet_user -d fleet_telemetry
```

**Expected output:**
```
/var/run/postgresql:5432 - accepting connections
```

### Step 5: Run Migrations

```bash
npm run migration:run
```

**Expected output:**
```
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: CREATE TABLE "migrations" ...
Migration CreateHotTables1707000001 has been executed successfully.
Migration CreateColdTables1707000002 has been executed successfully.
Migration CreateIndexes1707000003 has been executed successfully.
Migration SeedMappingData1707000004 has been executed successfully.
```

### Step 6: Verify Application Health

```bash
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T10:30:00Z",
  "uptime": 15.5
}
```

## ✅ Functional Testing

### Test 1: Ingest Meter Telemetry

```bash
curl -X POST http://localhost:3000/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "METER",
    "payload": {
      "meterId": "MTR-TEST-001",
      "kwhConsumedAc": 125.5,
      "voltage": 240.2,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

**Expected response (202 Accepted):**
```json
{
  "success": true,
  "message": "Telemetry data ingested successfully",
  "timestamp": "2026-02-04T10:30:15Z"
}
```

### Test 2: Ingest Vehicle Telemetry

```bash
curl -X POST http://localhost:3000/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "VEHICLE",
    "payload": {
      "vehicleId": "VEH-001",
      "soc": 75,
      "kwhDeliveredDc": 105.2,
      "batteryTemp": 32.5,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

**Expected response (202 Accepted):**
```json
{
  "success": true,
  "message": "Telemetry data ingested successfully",
  "timestamp": "2026-02-04T10:30:15Z"
}
```

### Test 3: Query Analytics

```bash
curl http://localhost:3000/v1/analytics/performance/VEH-001
```

**Expected response (200 OK):**
```json
{
  "vehicleId": "VEH-001",
  "period": {
    "start": "2026-02-03T10:30:00Z",
    "end": "2026-02-04T10:30:00Z"
  },
  "energyMetrics": {
    "totalAcConsumed": 0,
    "totalDcDelivered": 105.2,
    "efficiencyRatio": 0,
    "powerLoss": 0
  },
  "batteryMetrics": {
    "avgTemperature": 32.5,
    "maxTemperature": 32.5,
    "minTemperature": 32.5
  },
  "hourlyBreakdown": [...]
}
```

### Test 4: Verify Data in Database

```bash
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "
SELECT COUNT(*) FROM vehicles_current;
"
```

**Expected:** At least 1 row (VEH-001)

```bash
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "
SELECT COUNT(*) FROM vehicle_telemetry_history;
"
```

**Expected:** At least 1 row

### Test 5: Check Partitioning (TimescaleDB)

```bash
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "
SELECT * FROM timescaledb_information.chunks 
WHERE hypertable_name = 'vehicle_telemetry_history' 
LIMIT 5;
"
```

**Expected:** Shows chunk information (partitions created automatically)

## 🧪 Running Tests

### Unit Tests

```bash
npm run test
```

**Expected:**
- All tests pass
- Coverage report generated

### E2E Tests

```bash
npm run test:e2e
```

**Expected:**
- All API tests pass
- Ingestion and analytics endpoints work

### Load Tests (Optional)

```bash
# Install k6 first
brew install k6  # macOS

# Run load test
k6 run test/load/ingestion-load-test.js
```

**Expected:**
- Successfully handles 200+ req/sec
- P95 latency < 250ms
- No errors

## 📊 Verification Checklist

### Database Schema

Run this to verify all tables exist:

```bash
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "\dt"
```

**Expected tables:**
- [x] meters_current
- [x] vehicles_current
- [x] vehicle_meter_mapping
- [x] meter_telemetry_history
- [x] vehicle_telemetry_history
- [x] migrations

### Indexes

```bash
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
"
```

**Expected indexes:**
- [x] meters_current_pkey
- [x] vehicles_current_pkey
- [x] vehicle_meter_mapping_pkey
- [x] idx_mapping_meter_id
- [x] idx_meter_history_composite
- [x] idx_vehicle_history_composite

### API Endpoints

Visit Swagger documentation:
```
http://localhost:3000/api
```

**Expected:**
- [x] POST /v1/telemetry/ingest
- [x] GET /v1/analytics/performance/{vehicleId}
- [x] Interactive API testing UI

## 🔍 Troubleshooting

### Issue: Docker containers not starting

```bash
# Check logs
docker-compose logs postgres
docker-compose logs app

# Restart services
docker-compose down
docker-compose up -d
```

### Issue: Migration errors

```bash
# Check if database is ready
docker-compose exec postgres pg_isready

# Revert and re-run migrations
npm run migration:revert
npm run migration:run
```

### Issue: API not responding

```bash
# Check application logs
docker-compose logs -f app

# Check if port 3000 is available
lsof -i :3000

# Restart application
docker-compose restart app
```

### Issue: Database connection refused

```bash
# Verify postgres is running
docker-compose ps postgres

# Check environment variables
cat .env

# Test connection
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry -c "SELECT 1;"
```

## 📈 Performance Verification

### Test Ingestion Performance

```bash
# Simple benchmark (10 requests)
for i in {1..10}; do
  time curl -X POST http://localhost:3000/v1/telemetry/ingest \
    -H "Content-Type: application/json" \
    -d '{"type":"METER","payload":{"meterId":"MTR-'$i'","kwhConsumedAc":100,"voltage":240,"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}' \
    -w "\n"
done
```

**Expected:** Each request completes in <200ms

### Test Analytics Performance

```bash
time curl http://localhost:3000/v1/analytics/performance/VEH-001
```

**Expected:** Response in <500ms

## ✅ Final Verification

All items should be checked:

- [x] Docker services running (postgres + app)
- [x] Database migrations applied (4 migrations)
- [x] All tables created (6 total including migrations)
- [x] Indexes created (6+ indexes)
- [x] Health check returns 200 OK
- [x] Ingestion endpoint accepts METER telemetry
- [x] Ingestion endpoint accepts VEHICLE telemetry
- [x] Analytics endpoint returns performance data
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Swagger documentation accessible
- [x] No errors in application logs

## 📚 Next Steps

Once verification is complete:

1. **Review Documentation**
   - Read README.md for architecture details
   - Check docs/API_EXAMPLES.md for usage patterns
   - Review PROJECT_SUMMARY.md for overview

2. **Explore Features**
   - Test different telemetry patterns
   - Query analytics with custom date ranges
   - Monitor performance metrics

3. **Development**
   - Read CONTRIBUTING.md for development guide
   - Set up local development environment
   - Run tests before making changes

## 🎉 Success Criteria

Your implementation is ready if:

✅ All services are healthy
✅ Ingestion endpoint accepts both telemetry types
✅ Analytics endpoint returns correlated data
✅ Database schema matches specification
✅ Tests pass successfully
✅ Performance meets targets (<250ms ingestion, <500ms analytics)
✅ Documentation is complete

---

**Congratulations! Your Fleet Telemetry Platform is ready for production! 🚀**
