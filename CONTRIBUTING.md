# Contributing to Fleet Telemetry Platform

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Local Development

1. **Clone and setup**:
```bash
git clone <repository-url>
cd fleet-telemetry-platform
./setup.sh
```

2. **Start development server**:
```bash
npm run start:dev
```

3. **Run tests**:
```bash
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npm run test:cov       # Coverage report
```

## Project Structure

```
src/
├── modules/
│   ├── telemetry/     # Ingestion logic
│   ├── analytics/     # Analytics queries
│   └── database/      # Schema & migrations
├── common/            # Shared utilities
└── main.ts           # Application entry
```

## Development Workflow

### Adding New Features

1. **Create feature branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Implement changes**:
   - Add tests first (TDD approach)
   - Implement feature
   - Ensure tests pass
   - Update documentation

3. **Code quality**:
```bash
npm run lint           # Check code style
npm run format         # Auto-format code
npm run test:cov       # Verify coverage >80%
```

4. **Commit changes**:
```bash
git add .
git commit -m "feat: add new feature"
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Examples:
```
feat: add vehicle health score calculation
fix: resolve race condition in dual-write pattern
docs: update API examples with new endpoint
test: add integration tests for analytics service
```

## Database Migrations

### Creating Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/modules/database/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/modules/database/migrations/MigrationName
```

### Running Migrations

```bash
# Apply migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Migration Best Practices

1. **Never modify existing migrations** - create new ones
2. **Test migrations** on sample data before merging
3. **Include rollback logic** in `down()` method
4. **Document breaking changes** in migration comments

## Testing Guidelines

### Unit Tests

- Test individual functions/methods
- Mock external dependencies
- Aim for >90% coverage
- Location: `*.spec.ts` files

Example:
```typescript
describe('AnalyticsService', () => {
  it('should calculate efficiency ratio correctly', () => {
    const result = service.calculateEfficiency(100, 85);
    expect(result).toBe(0.85);
  });
});
```

### Integration Tests

- Test database interactions
- Use test database
- Clean up after tests
- Location: `*.integration-spec.ts` files

### E2E Tests

- Test complete request/response flow
- Verify API contracts
- Location: `test/*.e2e-spec.ts`

## Performance Considerations

### Database Queries

- Always use indexes for WHERE clauses
- Leverage partitioning for time-based queries
- Use EXPLAIN ANALYZE for query optimization
- Avoid N+1 queries

### API Design

- Return 202 Accepted for async operations
- Implement pagination for large datasets
- Use caching for frequently accessed data
- Add rate limiting for production

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for objects
- Use enums for fixed sets of values
- Document complex logic with comments

### NestJS Conventions

- One controller per route group
- Services for business logic
- Repositories for data access
- DTOs for validation

### Naming Conventions

- **Files**: kebab-case (e.g., `analytics.service.ts`)
- **Classes**: PascalCase (e.g., `AnalyticsService`)
- **Variables**: camelCase (e.g., `vehicleId`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

## Documentation

### Code Documentation

- Document public methods with JSDoc
- Explain "why" not "what" in comments
- Keep README.md up to date
- Update API examples when changing endpoints

### API Documentation

- Use Swagger decorators
- Provide example requests/responses
- Document error cases
- Include authentication requirements

## Pull Request Process

1. **Before submitting**:
   - Run all tests: `npm run test && npm run test:e2e`
   - Check code style: `npm run lint`
   - Update documentation
   - Add/update tests for changes

2. **PR Description**:
   - Clear title following commit conventions
   - Describe what changed and why
   - Link related issues
   - Add screenshots for UI changes

3. **Code Review**:
   - Address all review comments
   - Keep PRs small and focused
   - Respond to feedback professionally

4. **Merging**:
   - Squash commits if many small commits
   - Ensure CI passes
   - Get at least one approval

## Debugging

### Application Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

### Database Debugging

```bash
# Connect to database
docker-compose exec postgres psql -U fleet_user -d fleet_telemetry

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# View table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Profiling

```bash
# Run load tests
k6 run test/load/ingestion-load-test.js

# Monitor metrics
curl http://localhost:3000/metrics
```

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch: `release/v1.x.x`
4. Run full test suite
5. Create git tag: `git tag -a v1.x.x -m "Release v1.x.x"`
6. Push tag: `git push origin v1.x.x`

## Getting Help

- **Documentation**: Check README.md and docs/
- **Issues**: Search existing issues before creating new ones
- **Questions**: Use GitHub Discussions
- **Security**: Email security@example.com (do not create public issue)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
