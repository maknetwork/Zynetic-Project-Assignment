# Fleet Telemetry Platform

## Overview

This system processes telemetry from 10,000 smart meters and EV charging stations, handling approximately 14.4 million records daily. The core challenge is maintaining real-time current state while building a complete historical record for analytics, specifically correlating AC power consumption from the grid with DC power delivered to vehicle batteries to calculate charging efficiency.

## Architectural Decisions

### Hot/Cold Data Separation

The system uses a dual-table pattern to address two conflicting requirements:

**Hot Tables** store only the current state of each device (~20,000 rows total). When a dashboard needs to show "what's happening right now" across all vehicles, scanning through millions of historical records would be prohibitively slow. Instead, we maintain a single row per device that gets updated with each new reading via UPSERT operations.

**Cold Tables** store the complete historical record (append-only). Every reading that comes in gets permanently recorded for audit trails and analytics. These tables are partitioned by day, which means queries for specific time ranges only touch the relevant partitions instead of scanning the entire dataset.

This separation means:

This separation means:
- Dashboard queries are fast because they only touch ~20K rows
- Historical analytics have a complete record without gaps
- Write operations are optimized for each use case (UPSERT vs INSERT)

### Handling the Daily Volume

10,000 devices sending two types of readings every 60 seconds works out to:
- 20,000 data points per minute
- 28.8 million records per day (14.4M per stream)

The database handles this through several mechanisms:

**Transaction Batching**: Each reading triggers a dual write within a single transaction - one INSERT to history, one UPSERT to current state. This ensures consistency without requiring distributed transaction coordination.

**Connection Pooling**: Rather than opening a new database connection for each request, we maintain a pool of reusable connections. This eliminates the overhead of repeated connection establishment.

**Partitioning**: Historical tables are partitioned by day. When querying for the last 24 hours, PostgreSQL automatically excludes irrelevant partitions. This is critical - without partitioning, a 24-hour query would need to scan through months or years of data.

**Indexing Strategy**: Composite indexes on `(device_id, recorded_at)` cover both the filtering and sorting operations in most queries. This means the database can satisfy queries directly from the index without touching the table data.

### Data Correlation

The fundamental problem: meter readings and vehicle readings arrive independently, potentially seconds apart. To calculate charging efficiency (DC delivered / AC consumed), we need to match them up correctly.

**Approach**: Each vehicle is pre-mapped to a specific meter via a `vehicle_meter_mapping` table. This eliminates runtime discovery and gives us a deterministic relationship.

When generating analytics, the query joins vehicle history with meter history through this mapping, using a time window of ±5 seconds to account for:

When generating analytics, the query joins vehicle history with meter history through this mapping, using a time window of ±5 seconds to account for:
- Network latency differences between devices
- Minor clock drift between independent systems
- Variable transmission timing

The correlation query looks like this:

```sql
SELECT
  v.vehicle_id,
  DATE_TRUNC('hour', v.recorded_at) as hour,
  SUM(v.kwh_delivered_dc) as total_dc,
  SUM(m.kwh_consumed_ac) as total_ac,
  (SUM(v.kwh_delivered_dc) / NULLIF(SUM(m.kwh_consumed_ac), 0)) as efficiency
FROM vehicle_telemetry_history v
INNER JOIN vehicle_meter_mapping vmap ON v.vehicle_id = vmap.vehicle_id
INNER JOIN meter_telemetry_history m ON m.meter_id = vmap.meter_id
  AND m.recorded_at BETWEEN v.recorded_at - INTERVAL '5 seconds'
                        AND v.recorded_at + INTERVAL '5 seconds'
WHERE v.vehicle_id = $1
  AND v.recorded_at >= $2
  AND v.recorded_at < $3
GROUP BY v.vehicle_id, DATE_TRUNC('hour', v.recorded_at)
ORDER BY hour DESC;
```

Several things make this performant:

1. **The mapping table join is cheap** - it's only 10,000 rows and indexed
2. **Partition pruning activates automatically** - the date range filter excludes irrelevant partitions
3. **Composite indexes cover the query** - `(vehicle_id, recorded_at)` on both tables means the database can use index-only scans
4. **Time window is narrow** - ±5 seconds limits the number of meter records that need to be checked for each vehicle record

**Tradeoffs**: 
- If readings arrive >5 seconds apart, they won't correlate. In practice, this is rare but monitorable.
- The BETWEEN clause on timestamps prevents the use of certain index optimizations, but given the narrow window, this is acceptable.
- Aggregating by hour reduces output size but loses minute-level granularity.

### Why Not Real-Time Streaming?

You might wonder why we don't use a message queue or streaming system. The answer comes down to operational complexity vs. actual requirements.

Requirements analysis:
- Data arrives every 60 seconds (not subsecond)
- Analytics are queried on-demand, not continuously
- Dashboards showing "current" state can tolerate a few seconds of lag
- Historical correlation happens after the fact

Given this, HTTP + PostgreSQL provides:
- Simpler architecture (fewer moving parts)
- Built-in durability (no separate message persistence)
- Mature operational tooling
- SQL expressiveness for correlation logic

A streaming system would add complexity without solving a problem we actually have. If requirements changed to subsecond intervals or real-time alerting, that calculus would shift.
```
