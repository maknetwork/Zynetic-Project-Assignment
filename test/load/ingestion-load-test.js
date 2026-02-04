import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 RPS
    { duration: '1m', target: 100 },   // Ramp up to 100 RPS
    { duration: '2m', target: 200 },   // Peak at 200 RPS (simulates 10K devices)
    { duration: '1m', target: 100 },   // Ramp down
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<500'], // 95% < 250ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Generate random device IDs
function randomMeterId() {
  return `MTR-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

function randomVehicleId() {
  return `VEH-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// Test scenarios
export default function () {
  // Randomly choose between meter and vehicle telemetry
  const isMeter = Math.random() > 0.5;

  let payload;
  if (isMeter) {
    payload = {
      type: 'METER',
      payload: {
        meterId: randomMeterId(),
        kwhConsumedAc: Math.random() * 200,
        voltage: 220 + Math.random() * 20,
        timestamp: new Date().toISOString(),
      },
    };
  } else {
    payload = {
      type: 'VEHICLE',
      payload: {
        vehicleId: randomVehicleId(),
        soc: Math.floor(Math.random() * 100),
        kwhDeliveredDc: Math.random() * 150,
        batteryTemp: 20 + Math.random() * 30,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Send ingestion request
  const res = http.post(`${BASE_URL}/v1/telemetry/ingest`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Verify response
  const success = check(res, {
    'status is 202': (r) => r.status === 202,
    'response time < 250ms': (r) => r.timings.duration < 250,
    'response has success field': (r) => r.json('success') === true,
  });

  errorRate.add(!success);

  // Simulate 60-second intervals (adjust for load testing)
  sleep(0.1); // 100ms between requests in load test
}

// Analytics query test (separate scenario)
export function analyticsTest() {
  const vehicleId = randomVehicleId();
  const res = http.get(`${BASE_URL}/v1/analytics/performance/${vehicleId}`);

  check(res, {
    'analytics status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'analytics response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
