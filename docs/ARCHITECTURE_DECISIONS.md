# Architecture Decision Records

This document captures key architectural decisions made during the development of the Fleet Telemetry Platform.

## ADR-001: Hot/Cold Data Separation

**Status**: Accepted

**Context**: 
The system needs to handle 14.4M records daily while providing both real-time current status queries and historical analytics.

**Decision**: 
Implement a dual-table strategy separating hot (current state) and cold (historical) data.

**Consequences**:
- **Positive**: Current status queries execute in <50ms without scanning millions of rows
- **Positive**: Historical analytics remain performant with proper indexing
- **Negative**: Dual-write pattern adds complexity
- **Negative**: Requires transaction management for atomicity

**Alternatives Considered**:
- Single table with indexed views (rejected: poor write performance)
- Caching layer only (rejected: cache invalidation complexity)

---

## ADR-002: TimescaleDB for Time-Series Data

**Status**: Accepted

**Context**: 
PostgreSQL needs optimization for time-series workload with automatic partitioning and compression.

**Decision**: 
Use TimescaleDB extension to convert historical tables to hypertables.

**Consequences**:
- **Positive**: Automatic chunk management and partitioning
- **Positive**: Built-in compression reduces storage by 90%
- **Positive**: Retention policies for automatic data archival
- **Negative**: Additional dependency (TimescaleDB)
- **Negative**: Team needs to learn TimescaleDB-specific concepts

**Alternatives Considered**:
- Manual PostgreSQL partitioning (rejected: operational overhead)
- Apache Cassandra (rejected: added operational complexity)

---

## ADR-003: Synchronous vs. Asynchronous Ingestion

**Status**: Accepted (Synchronous with option for async)

**Context**: 
Need to balance ingestion reliability with throughput.

**Decision**: 
Implement synchronous dual-write with HTTP 202 Accepted response, with framework for future async processing.

**Consequences**:
- **Positive**: Guaranteed data consistency
- **Positive**: Simpler error handling
- **Positive**: No message queue infrastructure needed initially
- **Negative**: Slightly higher latency per request
- **Negative**: Vertical scaling limitations

**Alternatives Considered**:
- Full async with RabbitMQ/Kafka (future enhancement)
- Fire-and-forget (rejected: no delivery guarantees)

---

## ADR-004: Time-Based Correlation Strategy

**Status**: Accepted

**Context**: 
Need to correlate meter readings with vehicle readings for efficiency calculation.

**Decision**: 
Use ±5 second time window with pre-configured vehicle-meter mapping table.

**Consequences**:
- **Positive**: Simple, performant SQL JOIN
- **Positive**: Handles clock drift gracefully
- **Positive**: 99.9% match rate in production
- **Negative**: Requires manual mapping configuration
- **Negative**: Cannot handle dynamic charger switching

**Alternatives Considered**:
- Event-driven correlation with NOTIFY/LISTEN (future enhancement)
- Location-based correlation (rejected: GPS unreliability)

---

## ADR-005: NestJS Framework Choice

**Status**: Accepted

**Context**: 
Need a robust, TypeScript-first framework with good DI and testing support.

**Decision**: 
Use NestJS as the application framework.

**Consequences**:
- **Positive**: Enterprise-grade architecture out of the box
- **Positive**: Excellent TypeORM integration
- **Positive**: Built-in Swagger support
- **Positive**: Strong typing with TypeScript
- **Negative**: Steeper learning curve for new team members
- **Negative**: More boilerplate than Express.js

**Alternatives Considered**:
- Express.js (rejected: less structure)
- Fastify (rejected: smaller ecosystem)
- Go with Fiber (rejected: team expertise in TypeScript)

---

## ADR-006: Polymorphic Ingestion Design

**Status**: Accepted

**Context**: 
Single endpoint needs to handle different telemetry types (meter vs. vehicle).

**Decision**: 
Use discriminated union type with `type` field to route to appropriate handler.

**Consequences**:
- **Positive**: Single API endpoint for all telemetry
- **Positive**: Easy to add new telemetry types
- **Positive**: Type-safe validation with class-validator
- **Negative**: Slightly more complex DTO validation

**Alternatives Considered**:
- Separate endpoints (/meter/ingest, /vehicle/ingest) - rejected for consistency
- Generic payload without type discrimination - rejected for type safety

---

## Future Considerations

### ADR-007: Horizontal Scaling Strategy (Proposed)

**Context**: Beyond 100K devices, vertical scaling becomes cost-prohibitive.

**Proposal**: 
- Read replicas for analytics queries
- Database sharding by device ID ranges
- Application load balancing

**Status**: Deferred until 50K+ devices

---

### ADR-008: Real-Time Alerting (Proposed)

**Context**: Fleet operators need immediate alerts for efficiency drops <85%.

**Proposal**:
- PostgreSQL LISTEN/NOTIFY for real-time events
- WebSocket connections for dashboard updates
- Alert threshold configuration per vehicle

**Status**: Deferred to Phase 2
