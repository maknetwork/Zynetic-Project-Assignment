# API Usage Examples

## Quick Start

### 1. Ingest Meter Telemetry

```bash
curl -X POST http://localhost:3000/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "METER",
    "payload": {
      "meterId": "MTR-001",
      "kwhConsumedAc": 125.5,
      "voltage": 240.2,
      "timestamp": "2026-02-04T10:30:00Z"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Telemetry data ingested successfully",
  "timestamp": "2026-02-04T10:30:15Z"
}
```

---

### 2. Ingest Vehicle Telemetry

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
      "timestamp": "2026-02-04T10:30:00Z"
    }
  }'
```

---

### 3. Get Performance Analytics

```bash
curl http://localhost:3000/v1/analytics/performance/VEH-001
```

**Response:**
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
  ]
}
```

---

### 4. Custom Date Range Analytics

```bash
curl "http://localhost:3000/v1/analytics/performance/VEH-001?startDate=2026-02-01T00:00:00Z&endDate=2026-02-04T23:59:59Z"
```

---

## Batch Ingestion Example

Simulate multiple devices sending data:

```bash
#!/bin/bash

# Simulate 100 devices sending data
for i in {1..100}; do
  METER_ID=$(printf "MTR-%03d" $i)
  VEHICLE_ID=$(printf "VEH-%03d" $i)
  
  # Send meter reading
  curl -X POST http://localhost:3000/v1/telemetry/ingest \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"METER\",
      \"payload\": {
        \"meterId\": \"$METER_ID\",
        \"kwhConsumedAc\": $((RANDOM % 200 + 50)),
        \"voltage\": $((RANDOM % 20 + 220)),
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }
    }" &
  
  # Send vehicle reading
  curl -X POST http://localhost:3000/v1/telemetry/ingest \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"VEHICLE\",
      \"payload\": {
        \"vehicleId\": \"$VEHICLE_ID\",
        \"soc\": $((RANDOM % 100)),
        \"kwhDeliveredDc\": $((RANDOM % 150 + 50)),
        \"batteryTemp\": $((RANDOM % 30 + 20)),
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }
    }" &
done

wait
echo "Batch ingestion completed"
```

---

## Error Handling Examples

### Invalid Telemetry Type
```bash
curl -X POST http://localhost:3000/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INVALID",
    "payload": {}
  }'
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": ["type must be one of the following values: METER, VEHICLE"],
  "error": "Bad Request"
}
```

### Missing Required Fields
```bash
curl -X POST http://localhost:3000/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "METER",
    "payload": {
      "meterId": "MTR-001"
    }
  }'
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "payload.kwhConsumedAc should not be empty",
    "payload.voltage should not be empty"
  ],
  "error": "Bad Request"
}
```

### Vehicle Not Found
```bash
curl http://localhost:3000/v1/analytics/performance/VEH-NONEXISTENT
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Vehicle VEH-NONEXISTENT not found",
  "error": "Not Found"
}
```

---

## Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T10:30:00Z",
  "uptime": 3600.5
}
```

---

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3000/api
```
