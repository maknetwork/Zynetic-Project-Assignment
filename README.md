# Fleet Telemetry Platform

High-scale telemetry ingestion and analytics system for 10,000+ Smart Meters and EV Fleets, processing 14.4 million records daily.

## Overview

The platform handles two independent data streams arriving every 60 seconds from each device:

- Smart Meter Stream: AC power consumption from the utility grid
- EV Vehicle Stream: DC power delivery and battery metrics

### Features

- Polymorphic telemetry ingestion (METER/VEHICLE types)
- Hot/Cold data separation for optimal read/write performance
- Real-time current status queries (<50ms)
- 24-hour analytics with correlation (<500ms)
- Efficiency ratio calculation (DC delivered / AC consumed)
- Handles 14.4M records/day with horizontal scalability

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Fleet Operators, Dashboards, APIs)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API Gateway Layer                          │
│  POST /v1/telemetry/ingest    GET /v1/analytics/performance │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    NestJS Application                        │
│  ┌──────────────────┐  ┌─────────────────┐                 │
│  │ Telemetry Module │  │ Analytics Module│                 │
│  │  - Validation    │  │  - Correlation  │                 │
│  │  - Dual Write    │  │  - Aggregation  │                 │
│  └──────────────────┘  └─────────────────┘                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │  Hot Tables      │  │  Cold Tables (Partitioned)      │ │
│  │  (Current State) │  │  (Historical Time-Series)       │ │
│  │  - UPSERT        │  │  - INSERT ONLY                  │ │
│  │  - 20K rows      │  │  - Billions of rows             │ │
│  └──────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Device → Ingestion API → Validation → Dual Write Pattern
                                       ├─→ Historical Table (INSERT)
                                       └─→ Current State Table (UPSERT)
```

## Database Design

### Hot Tables (Current State) - ~20K Rows

**Purpose**: Instant access to latest device status without scanning millions of rows

```sql
meters_current (10K rows max)
├── meter_id (PK)
├── kwh_consumed_ac
├── voltage
├── last_updated_at
└── created_at

vehicles_current (10K rows max)
├── vehicle_id (PK)
├── soc
├── kwh_delivered_dc
├── battery_temp
├── charging_status
├── last_updated_at
└── created_at

vehicle_meter_mapping (10K rows)
├── vehicle_id (PK)
├── meter_id
├── location
└── installation_date
```

**Write Strategy**: `ON CONFLICT DO UPDATE` (UPSERT)

- Ensures single row per device
- O(1) lookup for dashboards
- Supports concurrent updates

### Cold Tables (Historical Data) - Billions of Rows

**Purpose**: Audit trail and time-series analytics

```sql
meter_telemetry_history (Partitioned by recorded_at)
├── id (PK, BIGSERIAL)
├── meter_id (FK, Indexed)
├── kwh_consumed_ac
├── voltage
├── recorded_at (Partition Key)
└── ingested_at

vehicle_telemetry_history (Partitioned by recorded_at)
├── id (PK, BIGSERIAL)
├── vehicle_id (FK, Indexed)
├── soc
├── kwh_delivered_dc
├── battery_temp
├── recorded_at (Partition Key)
└── ingested_at
```

**Write Strategy**: `INSERT ONLY` (Append-only)

- Immutable audit trail
- Optimized for batch inserts
- No update overhead

### Partitioning Strategy

**Daily Range Partitions**:

```sql
-- Example partitions
meter_telemetry_history_2026_02_01
meter_telemetry_history_2026_02_02
meter_telemetry_history_2026_02_03
...
```

**Benefits**:

- Query only relevant partitions (partition pruning)
- Easy to archive/drop old data
- Parallel query execution
- Index size reduction

### Indexes

```sql
-- Hot tables: Primary key only (small tables)
CREATE UNIQUE INDEX idx_meters_current_pk ON meters_current(meter_id);
CREATE UNIQUE INDEX idx_vehicles_current_pk ON vehicles_current(vehicle_id);

-- Cold tables: Composite indexes for analytics
CREATE INDEX idx_meter_history_composite
  ON meter_telemetry_history(meter_id, recorded_at DESC);

CREATE INDEX idx_vehicle_history_composite
  ON vehicle_telemetry_history(vehicle_id, recorded_at DESC);

-- Mapping table
CREATE INDEX idx_mapping_meter ON vehicle_meter_mapping(meter_id);
```

---

##olymorphic Ingestion

**Endpoint**: `POST /v1/telemetry/ingest`

**Request Examples**:

```json
// Meter Reading
{
  "type": "METER",
  "payload": {
    "meterId": "MTR-001",
    "kwhConsumedAc": 125.5,
    "voltage": 240.2,
    "timestamp": "2026-02-04T10:30:00Z"
  }
}

// Vehicle Reading
{
  "type": "VEHICLE",
  "payload": {
    "vehicleId": "VEH-001",
    "soc": 75,
    "kwhDeliveredDc": 105.2,
    "batteryTemp": 32.5,
    "timestamp": "2026-02-04T10:30:00Z"
  }
}
```

### Dual-Write Pattern

**Rationale**:

- Hot Table: Dashboard needs instant current status
- Cold Table: Analytics needs complete historical data

**Implementation**:

```typescript
async ingestTelemetry(reading: TelemetryReading) {
  // Use database transaction for atomicity
  await this.dataSource.transaction(async (manager) => {
    // Write 1: Append to history (INSERT)
    await manager.insert(HistoryEntity, reading);

    // Write 2: Update current state (UPSERT)
    await manager.upsert(CurrentEntity, reading, {
      conflictPaths: ['deviceId'],
      skipUpdateIfNoValuesChanged: true
    });
  });
}
```

### Handling 14.4M Records Daily

**Scale Breakdown**:

- 10,000 devices × 2 streams = 20,000 data sources
- 60-second intervals = 1,440 readings/day per source
- Total: 20,000 × 1,440 = **28.8M readings/day** (14.4M per stream)

**Architectural Strategies**:

1. **Hot/Cold Data Separation**
   - Hot tables store only current state (20K rows max) for instant dashboard queries
   - Cold tables store complete history with append-only pattern
   - Eliminates the need to scan millions of rows for current status
   - Each table optimized for its specific access pattern

2. **Dual-Write Transaction Pattern**
   - Single transaction ensures atomicity across both tables
   - History table uses INSERT (optimized for append operations)
   - Current table uses UPSERT (ensures single row per device)
   - Prevents data inconsistency between hot and cold storage

3. **Connection Pooling**
   - Configurable pool size prevents connection exhaustion
   - Connection reuse reduces overhead of establishing new connections
   - Idle timeout prevents resource leaks

   ```typescript
   max: 50,  // Adjust based on workload
   min: 10,
   idleTimeoutMillis: 30000
   ```

4. **Database Partitioning**
   - Daily partitions limit query scan range (partition pruning)
   - Each partition is independently manageable for archival
   - Reduces index size and maintenance overhead
   - Enables parallel query execution across partitions

---

## Analytics and

```
GET /v1/analytics/performance/:vehicleId
Query Params: startDate, endDate (defaults to last 24 hours)
```

### Response Schema

```json
{
  "vehicleId": "VEH-001",
  "period": {
    "start": "2026-02-03T10:30:00Z",
    "end": "2026-02-04T10:30:00Z"
  },
  "energyMetrics": {
    "totalAcConsumed": 125.5,
    "totalDcDelivered": 105.2,
    "efficiencyRatio": 0.838,
    "powerLoss": 20.3
  },
  "batteryMetrics": {
    "avgTemperature": 32.5,
    "maxTemperature": 38.2,
    "minTemperature": 28.1
  },
  "hourlyBreakdown": [
    {
      "hour": "2026-02-04T10:00:00Z",
      "acConsumed": 5.2,
      "dcDelivered": 4.4,
      "efficiency": 0.846
    }
    // ... more hours
  ]
}
```

### Correlation Strategy

**Problem**: Match meter readings with vehicle readings for efficiency calculation

**Solution**: Time-Based Correlation with Pre-Configured Mapping

```sql
-- Query with optimized JOIN and partition pruning
SELECT
  v.vehicle_id,
  DATE_TRUNC('hour', v.recorded_at) as hour,
  SUM(v.kwh_delivered_dc) as total_dc_delivered,
  SUM(m.kwh_consumed_ac) as total_ac_consumed,
  (SUM(v.kwh_delivered_dc) / NULLIF(SUM(m.kwh_consumed_ac), 0)) as efficiency_ratio,
  AVG(v.battery_temp) as avg_battery_temp,
  MAX(v.battery_temp) as max_battery_temp,
  MIN(v.battery_temp) as min_battery_temp
FROM vehicle_telemetry_history v
INNER JOIN vehicle_meter_mapping vmap
  ON v.vehicle_id = vmap.vehicle_id
INNER JOIN meter_telemetry_history m
  ON m.meter_id = vmap.meter_id
  -- Correlation window: ±5 seconds for clock drift
  AND m.recorded_at BETWEEN v.recorded_at - INTERVAL '5 seconds'
                        AND v.recorded_at + INTERVAL '5 seconds'
WHERE v.vehicle_id = $1
  AND v.recorded_at >= $2  -- Start date (partition pruning)
  AND v.recorded_at < $3   -- End date (partition pruning)
GROUP BY v.vehicle_id, DATE_TRUNC('hour', v.recorded_at)
ORDER BY hour DESC;
```

**Architectural Design Decisions**:

1. **Pre-Configured Mapping Table**
   - Eliminates runtime discovery of vehicle-meter relationships
   - Static mapping reduces JOIN complexity
   - Single source of truth for device associations

2. **Time-Window Correlation (±5 seconds)**
   - Accounts for network latency between device transmissions
   - Handles minor clock drift between independent devices
   - Balance between accuracy and match rate

3. **Composite Indexes**
   - `(vehicle_id, recorded_at DESC)` enables efficient time-range queries
   - Index covers both filtering and sorting operations
   - Reduces need for separate table scans

4. **Partition Pruning**
   - Date range constraints limit scan to relevant partitions only
   - Dramatically reduces I/O for time-based analytics
   - Query planner automatically excludes irrelevant partitions

**Edge Case Handling**:

- Missing readings: Reported as null in hourly breakdown to maintain data integrity
- Multiple matches within window: Use closest timestamp to minimize correlation error
- Clock skew detection: System can alert on correlation failures indicating synchronization issues

---

##rerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)

### Setup & Run

```bash
# 1. Clone the repository
git clone <repository-url>
cd fleet-telemetry-platform

# 2. Copy environment configuration
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Wait for database initialization (~10 seconds)
docker-compose logs -f postgres

# 5. Run migrations
docker-compose exec app npm run migration:run

# 6. Verify health
curl http://localhost:3000/health
```

**Service Endpoints**:

- API: http://localhost:3000
- PostgreSQL: localhost:5432
- Swagger Docs: http://localhost:3000/api

---

##un All Tests

```bash
# Unit tests
npm run test

# Integration tests (requires database)
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

### Load Testing

Simulate 10,000 devices sending data every 60 seconds:

```bash
# Install k6
brew install k6  # macOS

# Run load test
k6 run test/load/ingestion-load-test.js
```

**Testing Approach**:

- Validates system behavior under expected production load
- Identifies bottlenecks in ingestion pipeline
- Measures database write performance under concurrent load
- Tests partition and index effectiveness

---

## 📁 Project Structure

##rc/
│ ├── modules/
│ │ ├── telemetry/ # Ingestion module
│ │ │ ├── controllers/
│ │ │ │ └── telemetry-ingestion.controller.ts
│ │ │ ├── services/
│ │ │ │ ├── telemetry-ingestion.service.ts
│ │ │ │ ├── meter-handler.service.ts
│ │ │ │ └── vehicle-handler.service.ts
│ │ │ ├── dto/
│ │ │ │ ├── meter-reading.dto.ts
│ │ │ │ ├── vehicle-reading.dto.ts
│ │ │ │ └── telemetry-request.dto.ts
│ │ │ ├── entities/
│ │ │ │ ├── meter-current.entity.ts
│ │ │ │ ├── meter-history.entity.ts
│ │ │ │ ├── vehicle-current.entity.ts
│ │ │ │ ├── vehicle-history.entity.ts
│ │ │ │ └── vehicle-meter-mapping.entity.ts
│ │ │ └── telemetry.module.ts
│ │ ├── analytics/ # Analytics module
│ │ │ ├── controllers/
│ │ │ │ └── analytics.controller.ts
│ │ │ ├── services/
│ │ │ │ ├── analytics.service.ts
│ │ │ │ └── correlation.service.ts
│ │ │ ├── dto/
│ │ │ │ └── performance-response.dto.ts
│ │ │ └── analytics.module.ts
│ │ └── database/ # Database configuration
│ │ ├── migrations/
│ │ │ ├── 1707000001-CreateHotTables.ts
│ │ │ ├── 1707000002-CreateColdTables.ts
│ │ │ ├── 1707000003-CreatePartitions.ts
│ │ │ ├── 1707000004-CreateIndexes.ts
│ │ │ └── 1707000005-SeedMappingData.ts
│ │ ├── seeds/
│ │ └── database.module.ts
│ ├── common/
│ │ ├── interceptors/
│ │ ├── filters/
│ │ ├── validators/
│ │ └── config/
│ ├── app.module.ts
│ └── main.ts
├── test/
│ ├── unit/
│ ├── integration/
│ ├── e2e/
│ └── load/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .gitignore
└── README.md

```

---

## 🔧 Configuration

### Environment Variables

##ENV=production
PORT=3000
API_PREFIX=/v1

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=fleet_telemetry
DB_USER=fleet_user
DB_PASSWORD=secure_password_here
DB_POOL_SIZE=50

# Features
ENABLE_SWAGGER=true
ENABLE_CORRELATION_ALERTS=true
BATCH_INSERT_SIZE=100
```

---

## 📊 System Design Metrics

### Data Volume

| Metric           | Daily Volume   |
| ---------------- | -------------- |
| Total Writes     | 28.8M records  |
| Per Stream       | 14.4M records  |
| Devices          | 20,000 sources |
| Reading Interval | 60 seconds     |

### Database Growth Pattern

- **Hot Tables**: Fixed size (~20K rows) - constant memory footprint
- **Cold Tables**: Linear growth with data volume
- **Partitioning**: Daily partitions enable efficient archival and maintenance
- **Indexing**: Composite indexes on (device_id, timestamp) for query optimization

---

## 🔐 Security Considerations

- Input validation with class-validator for request payload verification
- SQL injection prevention through parameterized queries (TypeORM)
- Rate limiting capabilities to prevent device abuse
- API key authentication mechanism for production deployment
- HTTPS/TLS encryption support for data in transit
- Database connection encryption support

## Scaling Strategies

### Horizontal Scaling Approaches

**Application Layer**:

- Stateless application design enables multiple instances behind load balancer
- Each instance maintains independent database connection pool
- No shared state between application instances

**Database Layer**:

- **Read Replicas**: Separate read-heavy analytics queries from write-heavy ingestion
- **Sharding**: Partition data by device_id ranges for extreme scale (>100K devices)
- **TimescaleDB**: Alternative for automatic chunk management and compression

### Vertical Scaling Considerations

- Application instances: CPU-bound for JSON parsing and validation
- Database server: Memory-bound for maintaining working set and indexes
- Storage: I/O-bound for write throughput and partition management
- Connection pooling prevents database connection exhaustion

---

## 🛠️ Maintenance

### Database Partitioning

```bash
# Auto-create next month's partitions
npm run partition:create-next-month

# Archive partitions older than 1 year
npm run partition:archive --older-than=365
##nitoring

- Application metrics: Prometheus + Grafana
- Database metrics: pg_stat_statements
- Alerting: Alert when efficiency < 85%

---

## 🤝 API Documentation

Full API documentation available at:
- **Swagger UI**: http://localhost:3000/api
- **Postman Collection**: `docs/postman_collection.json`

---

## 📝 License

## API Documentation

Full API documentation available at:
- Swagger UI: http://localhost:3000/api
- Postman Collection: `docs/postman_collection.json`

## License

MIT

## Author

Fleet Platform Engineering Team

## Built With

- NestJS: Progressive Node.js framework
- TypeORM: ORM for TypeScript
- PostgreSQL: Advanced relational database
- TimescaleDB:
```
