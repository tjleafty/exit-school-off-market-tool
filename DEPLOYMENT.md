# Production Deployment Guide
## Exit School Off-Market Tool

### Prerequisites

Before deploying to production, ensure you have:

1. **Vercel CLI installed**
   ```bash
   npm i -g vercel
   ```

2. **Supabase Project** set up with:
   - Database schema deployed
   - Edge Functions deployed
   - RLS policies configured
   - API keys configured

3. **Third-party API Keys**:
   - OpenAI API Key
   - Resend API Key  
   - Google Places API Key
   - Hunter.io API Key
   - Apollo.io API Key
   - ZoomInfo API Key

### Deployment Steps

#### 1. Environment Setup

Run the automated setup script:

```bash
./scripts/setup-vercel.sh
```

Or manually configure environment variables:

```bash
# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add RESEND_API_KEY production
vercel env add GOOGLE_PLACES_API_KEY production
vercel env add HUNTER_API_KEY production
vercel env add APOLLO_API_KEY production
vercel env add ZOOMINFO_API_KEY production
vercel env add CRON_SECRET production
```

#### 2. Deploy to Production

```bash
vercel --prod
```

#### 3. Verify Deployment

1. **Health Check**: Visit `https://your-domain.com/api/health`
2. **Cron Jobs**: Check Vercel dashboard for cron job status
3. **Database**: Verify Supabase connection
4. **Edge Functions**: Test API endpoints

### Cron Jobs Configuration

The following cron jobs are automatically configured:

| Job | Schedule | Description |
|-----|----------|-------------|
| `process-enrichments` | Every 15 minutes | Processes company enrichments |
| `send-emails` | Every hour | Sends campaign emails |
| `daily-reports` | 8 AM daily | Generates daily reports |
| `cleanup` | Midnight daily | Cleans up old data |

### Monitoring & Health Checks

#### Health Check Endpoints

- **Main Health**: `/api/health`
- **Enrichment Service**: `/api/cron/process-enrichments` (GET)
- **Email Service**: `/api/cron/send-emails` (GET)
- **Reports Service**: `/api/cron/daily-reports` (GET)
- **Cleanup Service**: `/api/cron/cleanup` (GET)

#### Monitoring Checklist

- [ ] All cron jobs running successfully
- [ ] Database connections healthy
- [ ] Edge Functions responding
- [ ] Email delivery working
- [ ] API rate limits not exceeded
- [ ] Error logs reviewed

### Security Configuration

#### Environment Variables Security

All sensitive data is stored as Vercel environment variables:
- Database credentials
- API keys  
- Cron secrets
- Service role keys

#### API Security

- CRON endpoints protected with bearer token authentication
- CORS headers configured
- Rate limiting implemented
- Request validation in place

### Performance Optimization

#### Next.js Optimizations

- Bundle splitting enabled
- Image optimization configured
- Compression enabled
- Security headers set

#### Database Optimizations

- Connection pooling via Supabase
- Query optimization with indexes
- RLS policies for data isolation

### Troubleshooting

#### Common Issues

1. **Cron Jobs Not Running**
   - Check Vercel dashboard for errors
   - Verify `CRON_SECRET` environment variable
   - Check function timeout limits

2. **Database Connection Errors**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Validate service role permissions

3. **API Rate Limits**
   - Monitor third-party API usage
   - Implement retry logic with backoff
   - Consider upgrading API plans

4. **Email Delivery Issues**
   - Check Resend API key and domain
   - Verify DNS records for custom domains
   - Monitor bounce/spam rates

#### Log Analysis

```bash
# View function logs
vercel logs --follow

# Filter by function
vercel logs --follow api/cron/process-enrichments

# View specific deployment logs  
vercel logs deployment-url
```

### Maintenance

#### Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches  
- **Quarterly**: Review API usage and costs

#### Data Backup

Supabase handles automated backups, but consider:
- Exporting critical data monthly
- Testing restore procedures
- Documenting recovery processes

### Support

For deployment issues:
1. Check Vercel dashboard for errors
2. Review Supabase logs
3. Monitor third-party API status pages
4. Contact support teams if needed

### Production Checklist

- [ ] All environment variables configured
- [ ] Cron jobs running successfully  
- [ ] Health checks passing
- [ ] Email delivery tested
- [ ] Database migrations applied
- [ ] Security headers configured
- [ ] Performance monitoring setup
- [ ] Backup procedures verified
- [ ] Documentation updated
- [ ] Team access configured