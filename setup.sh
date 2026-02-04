#!/bin/bash

# Fleet Telemetry Platform Setup Script
# This script automates the complete setup process

set -e

echo "🚀 Fleet Telemetry Platform - Setup Script"
echo "==========================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
else
    echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

max_attempts=30
attempt=0

while ! docker-compose exec -T postgres pg_isready -U fleet_user -d fleet_telemetry &> /dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ PostgreSQL failed to start after $max_attempts attempts"
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts - waiting..."
    sleep 2
done

echo "✅ PostgreSQL is ready"
echo ""

# Install Node.js dependencies (if running locally)
if command -v node &> /dev/null; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npm run migration:run
    echo "✅ Migrations completed"
    echo ""
fi

# Start application container
echo "🚀 Starting application..."
docker-compose up -d app

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 15

max_attempts=20
attempt=0

while ! curl -f http://localhost:3000/health &> /dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Application failed to start"
        echo "📋 Application logs:"
        docker-compose logs app
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts - waiting..."
    sleep 3
done

echo "✅ Application is ready"
echo ""

# Display status
echo "================================================"
echo "✅ Setup completed successfully!"
echo "================================================"
echo ""
echo "📍 Service URLs:"
echo "   - API: http://localhost:3000/v1"
echo "   - Swagger Docs: http://localhost:3000/api"
echo "   - Health Check: http://localhost:3000/health"
echo "   - PostgreSQL: localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - View database: docker-compose exec postgres psql -U fleet_user -d fleet_telemetry"
echo ""
echo "📖 Next steps:"
echo "   1. Test ingestion: curl -X POST http://localhost:3000/v1/telemetry/ingest -H 'Content-Type: application/json' -d '{\"type\":\"METER\",\"payload\":{\"meterId\":\"MTR-001\",\"kwhConsumedAc\":125.5,\"voltage\":240.2,\"timestamp\":\"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'\"}}'
"
echo "   2. Check analytics: curl http://localhost:3000/v1/analytics/performance/VEH-001"
echo "   3. Read API documentation: http://localhost:3000/api"
echo ""
