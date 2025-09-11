# Exit School Off-Market Tool - Monitoring & Observability Guide

Comprehensive monitoring, error tracking, and observability for production-ready insights and proactive issue resolution.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Health Checks](#health-checks)
4. [Error Tracking](#error-tracking)
5. [Performance Monitoring](#performance-monitoring)
6. [Logging System](#logging-system)
7. [Dashboards & Metrics](#dashboards--metrics)
8. [Alerting & Notifications](#alerting--notifications)
9. [Security Monitoring](#security-monitoring)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

Our monitoring strategy provides comprehensive observability across:

- **Application Health**: Real-time system status and component health
- **Performance Metrics**: Response times, throughput, and resource usage
- **Error Tracking**: Comprehensive error collection, analysis, and alerting
- **User Experience**: Core Web Vitals and user journey monitoring
- **Security Events**: Authentication, authorization, and threat detection
- **Business Metrics**: Usage patterns, conversion rates, and feature adoption

## 🏗️ Monitoring Stack

### Core Components

#### 1. Vercel Analytics & Speed Insights
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Integrated in root layout for automatic tracking
<Analytics />
<SpeedInsights />
```

**Features:**
- Page views and user interactions
- Core Web Vitals (LCP, FID, CLS)
- Real user monitoring (RUM)
- Performance insights

#### 2. Sentry Error Tracking
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

**Features:**
- Automatic error capture and reporting
- Session replay for error reproduction
- Performance monitoring
- Release tracking

#### 3. Supabase Monitoring
```typescript
// lib/supabase-admin.ts
export async function getSystemHealth(): Promise<SystemHealth> {
  const [databaseHealth, edgeFunctionsHealth, metrics] = await Promise.all([
    checkDatabaseHealth(),
    checkEdgeFunctionsHealth(),
    getSystemMetrics(),
  ])
  
  return {
    timestamp: new Date().toISOString(),
    overall: databaseHealth.healthy && edgeFunctionsHealth.every(func => func.healthy),
    database: databaseHealth,
    edgeFunctions: edgeFunctionsHealth,
    metrics,
  }
}
```

**Features:**
- Database connection monitoring
- Edge function health checks
- Query performance tracking
- Connection metrics

#### 4. Custom Logging System
```typescript
// lib/logger.ts
import { logger, LogCategory } from '@/lib/logger'

// Structured logging with categories
await logger.info(LogCategory.API, 'User login successful', {
  userId: user.id,
  ip: request.ip,
  duration: responseTime,
})
```

**Features:**
- Structured logging with categories
- Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Automatic buffering and database storage
- Context-aware logging

## 🏥 Health Checks

### Health Check Endpoint

**URL:** `GET /api/health`

**Query Parameters:**
- `metrics=true` - Include system metrics
- `alerts=true` - Include active alerts
- `performance=true` - Include performance data

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "abc123",
  "environment": "production",
  "database": {
    "healthy": true,
    "responseTime": 45,
    "recentActivity": 150
  },
  "edgeFunctions": [
    {
      "name": "send-invitation",
      "healthy": true,
      "responseTime": 120
    }
  ],
  "responseTime": 234
}
```

### Monitoring Components

#### Database Health
- Connection status and response time
- Recent activity tracking
- Query performance metrics
- Connection pool status

#### Edge Functions Health
- Function availability
- Response time monitoring
- Execution success rates
- Last execution timestamps

#### External Service Health
- API connectivity checks
- Response time monitoring
- Error rate tracking
- Service dependency status

### Automated Health Checks

```bash
# Run comprehensive health check
curl https://your-app.vercel.app/api/health?metrics=true&alerts=true

# Simple health check for load balancers
curl -I https://your-app.vercel.app/api/health

# Monitor with cron job
*/5 * * * * curl -f https://your-app.vercel.app/api/health || echo "Health check failed"
```

## 🚨 Error Tracking

### Error Categories

#### Client-Side Errors
- JavaScript runtime errors
- Network failures
- Component crashes
- User interaction errors

#### Server-Side Errors
- API endpoint failures
- Database connection errors
- External service timeouts
- Authentication failures

#### Edge Function Errors
- Function execution errors
- Timeout errors
- Memory limit errors
- Cold start issues

### Error Severity Levels

- **CRITICAL**: System down, data corruption, security breaches
- **HIGH**: API failures, database errors, service outages
- **MEDIUM**: Validation errors, not found errors, rate limits
- **LOW**: Debug information, deprecation warnings

### Error Reporting API

**URL:** `POST /api/errors`

**Payload:**
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "timestamp": "2024-01-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "url": "https://app.com/dashboard",
  "userId": "user_123",
  "severity": "high",
  "tags": {
    "component": "search-form",
    "feature": "company-search"
  }
}
```

### Error Analytics

- Error frequency and trends
- Error fingerprinting for deduplication
- User impact analysis
- Root cause identification
- Fix deployment tracking

## ⚡ Performance Monitoring

### Core Web Vitals Tracking

#### Largest Contentful Paint (LCP)
- Target: < 2.5 seconds
- Measures loading performance
- Tracked automatically by Speed Insights

#### First Input Delay (FID)
- Target: < 100 milliseconds
- Measures interactivity
- Captured on user interactions

#### Cumulative Layout Shift (CLS)
- Target: < 0.1
- Measures visual stability
- Tracked during page lifecycle

### API Performance Monitoring

```typescript
// Automatic API monitoring with middleware
export const withPerformanceMonitoring = (handler) => {
  return async (request) => {
    const startTime = performance.now()
    const response = await handler(request)
    const duration = performance.now() - startTime
    
    await logger.api(
      request.method,
      request.url,
      response.status,
      duration
    )
    
    return response
  }
}
```

### Database Performance

- Query execution times
- Slow query detection (>1s threshold)
- Connection pool metrics
- Index usage analysis

### External API Performance

```typescript
// Monitor external API calls
const result = await ExternalApiMonitor.monitorCall('google-places', async () => {
  return await fetch('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    // API call configuration
  })
})
```

## 📊 Logging System

### Log Categories

- `APPLICATION` - General application events
- `AUTHENTICATION` - Login, logout, registration
- `DATABASE` - Database operations and queries
- `API` - API requests and responses
- `EMAIL` - Email sending and delivery
- `SEARCH` - Company search operations
- `ENRICHMENT` - Data enrichment processes
- `SECURITY` - Security events and threats
- `PERFORMANCE` - Performance metrics and alerts

### Log Levels

- `DEBUG` - Detailed development information
- `INFO` - General informational messages
- `WARN` - Warning conditions
- `ERROR` - Error conditions
- `FATAL` - Critical errors requiring immediate attention

### Structured Logging

```typescript
// Example: API request logging
await logger.api('POST', '/api/search', 200, 450, {
  userId: 'user_123',
  searchTerm: 'restaurants seattle',
  resultCount: 25,
  cacheHit: true,
})

// Example: Security event logging
await logger.security('Failed login attempt', 'MEDIUM', {
  email: 'user@example.com',
  ip: '192.168.1.100',
  attemptCount: 3,
})
```

### Log Storage and Retention

- **Database Storage**: Structured logs in `system_logs` table
- **Retention Policy**: 30 days for INFO/DEBUG, 90 days for WARN/ERROR/FATAL
- **Compression**: Automatic compression for older logs
- **Export**: CSV/JSON export for compliance and analysis

## 📈 Dashboards & Metrics

### Monitoring Dashboard

**URL:** `GET /api/monitoring`

**Parameters:**
- `timeRange` - 1h, 24h, 7d, 30d
- `metric` - all, health, performance, errors, usage, api, database, security

### Key Metrics

#### System Health
- Overall system status
- Component availability
- Response time trends
- Error rates

#### Performance Metrics
- Average response times
- 95th percentile response times
- Throughput (requests/minute)
- Error rates by endpoint

#### Usage Analytics
- Active users
- Feature adoption
- Search volume
- Email campaign performance

#### Business Metrics
- User registrations
- Company searches
- Report generations
- Revenue attribution

### Visualization

Dashboard provides:
- Real-time status indicators
- Time-series charts
- Error trending
- Performance heatmaps
- Geographic user distribution
- Feature usage funnels

## 🔔 Alerting & Notifications

### Alert Thresholds

#### Critical Alerts (Immediate Response)
- System health check failures
- Database connection loss
- Error rate > 5%
- Response time > 10 seconds
- Security breach detection

#### Warning Alerts (Monitor Closely)
- Error rate > 1%
- Response time > 2 seconds
- Memory usage > 80%
- Disk space > 90%
- Failed email delivery rate > 10%

#### Info Alerts (Track Trends)
- New user registrations
- High usage periods
- Feature usage milestones
- Performance improvements

### Notification Channels

#### Development Team
- **Slack/Discord**: Real-time alerts and status updates
- **Email**: Critical alerts and daily summaries
- **PagerDuty**: After-hours critical alerts

#### Business Team
- **Email**: Weekly performance reports
- **Dashboard**: Real-time business metrics
- **Slack**: Major milestone notifications

### Alert Configuration

```bash
# Environment variables for alerting
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL_RECIPIENTS=dev-team@company.com
PAGERDUTY_INTEGRATION_KEY=...
```

### Alert Management

- **Escalation Policies**: Auto-escalate unacknowledged critical alerts
- **Alert Grouping**: Group similar alerts to reduce noise
- **Maintenance Windows**: Suppress alerts during planned maintenance
- **Alert History**: Track alert frequency and resolution times

## 🔐 Security Monitoring

### Security Events

#### Authentication Events
- Failed login attempts
- Password resets
- Account lockouts
- Suspicious login locations

#### Authorization Events
- Privilege escalation attempts
- Unauthorized access attempts
- Role changes
- Permission violations

#### Data Access Events
- Sensitive data access
- Bulk data exports
- Unusual query patterns
- API key usage

### Threat Detection

- **Rate Limiting**: Monitor and alert on rate limit violations
- **IP Blocking**: Track and block malicious IP addresses
- **Anomaly Detection**: Identify unusual user behavior patterns
- **SQL Injection**: Monitor for potential SQL injection attempts

### Compliance Monitoring

- **GDPR**: Data access and deletion requests
- **SOC 2**: Security control monitoring
- **Audit Trail**: Complete audit trail for all user actions

## 🛠️ Troubleshooting

### Common Issues

#### High Error Rate
1. Check `/api/monitoring?metric=errors` for error breakdown
2. Review recent deployments in Sentry
3. Check database connection status
4. Review external API status

#### Slow Response Times
1. Check `/api/health?performance=true` for bottlenecks
2. Review database query performance
3. Check external API response times
4. Monitor memory and CPU usage

#### Database Issues
1. Check connection pool status
2. Review slow query log
3. Monitor database metrics in Supabase
4. Check for lock contention

### Debugging Tools

#### Health Check Commands
```bash
# Comprehensive health check
curl "https://your-app.vercel.app/api/health?metrics=true&alerts=true&performance=true" | jq

# Specific component health
curl "https://your-app.vercel.app/api/monitoring?metric=database&timeRange=1h" | jq

# Error analysis
curl "https://your-app.vercel.app/api/errors?hours=24&severity=high" | jq
```

#### Log Analysis
```bash
# Search logs for specific user
curl "https://your-app.vercel.app/api/logs?userId=user_123&hours=24" | jq

# Find performance issues
curl "https://your-app.vercel.app/api/logs?category=PERFORMANCE&level=WARN" | jq

# Security event analysis
curl "https://your-app.vercel.app/api/logs?category=SECURITY&hours=168" | jq
```

### Performance Analysis

#### Slow Endpoint Investigation
1. Check endpoint-specific metrics in monitoring dashboard
2. Review database queries for the endpoint
3. Check external API dependencies
4. Analyze user load patterns

#### Memory Leak Detection
1. Monitor memory usage trends
2. Check for growing object counts
3. Review connection pool usage
4. Analyze garbage collection patterns

### Escalation Procedures

#### Critical Issues (P0)
1. Alert development team immediately
2. Create incident response channel
3. Implement emergency fixes
4. Communicate status to stakeholders
5. Conduct post-incident review

#### Major Issues (P1)
1. Alert development team within 15 minutes
2. Assess impact and priority
3. Implement fixes within SLA
4. Update status page
5. Document resolution

## 📋 Best Practices

### Monitoring Hygiene

1. **Regular Health Checks**: Automated health checks every 5 minutes
2. **Alert Tuning**: Regular review and adjustment of alert thresholds
3. **Dashboard Maintenance**: Keep dashboards current and relevant
4. **Log Rotation**: Implement proper log retention policies
5. **Performance Baselines**: Establish and maintain performance baselines

### Incident Response

1. **Runbooks**: Maintain up-to-date incident response runbooks
2. **On-Call Rotation**: Establish fair and sustainable on-call rotation
3. **Communication**: Clear communication channels for incidents
4. **Post-Mortems**: Conduct blameless post-mortems for all incidents
5. **Continuous Improvement**: Regularly improve monitoring based on incidents

### Security Best Practices

1. **Access Control**: Limit monitoring dashboard access to authorized personnel
2. **Data Privacy**: Ensure monitoring doesn't expose sensitive user data
3. **Audit Trail**: Maintain complete audit trail for monitoring access
4. **Encryption**: Encrypt sensitive monitoring data in transit and at rest
5. **Regular Reviews**: Regular security reviews of monitoring infrastructure

---

## 🚀 Quick Reference

### Essential URLs

- **Health Check**: `https://your-app.vercel.app/api/health`
- **Monitoring Dashboard**: `https://your-app.vercel.app/api/monitoring`
- **Error Analytics**: `https://your-app.vercel.app/api/errors`
- **Sentry Dashboard**: `https://sentry.io/organizations/your-org/projects/`
- **Vercel Analytics**: `https://vercel.com/your-team/your-project/analytics`

### Emergency Contacts

- **Development Team**: dev-team@company.com
- **On-Call Engineer**: +1-555-ON-CALL
- **Incident Commander**: incident-commander@company.com

### Key Thresholds

- **Critical Response Time**: > 10 seconds
- **Warning Response Time**: > 2 seconds
- **Critical Error Rate**: > 5%
- **Warning Error Rate**: > 1%
- **Memory Warning**: > 80% usage
- **Disk Warning**: > 90% usage

This comprehensive monitoring and observability setup ensures proactive identification and resolution of issues, maintaining optimal performance and user experience for the Exit School Off-Market Tool.