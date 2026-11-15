# ReserVio — Operations and Recovery Runbook

## 1. Purpose

This runbook describes how to start, monitor, troubleshoot, restart, back up, restore, and roll back the ReserVio deployment.

**Deployment components:**

- Nginx reverse proxy
- Node.js Express API
- PostgreSQL database
- Docker Compose orchestration

## 2. Start and Stop Services

Start all services:

```powershell
docker compose up -d
```

Check service status:

```powershell
docker compose ps
```

Stop services without deleting persistent data:

```powershell
docker compose down
```

Restart services:

```powershell
docker compose restart
```

Do not use `docker compose down -v` during routine operations because it can delete the PostgreSQL data volume.

## 3. Health and Readiness Checks

Check API health:

```powershell
curl.exe -k https://127.0.0.1/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "ReserVio API"
}
```

The timestamp field will also be present.

Check database readiness:

```powershell
curl.exe -k https://127.0.0.1/api/ready
```

Expected response:

```json
{
  "status": "ready",
  "database": "connected"
}
```

Check HTTP redirection:

```powershell
curl.exe -I http://127.0.0.1
```

Expected HTTP status: `301 Moved Permanently`.

## 4. Logs and Troubleshooting

View all service logs:

```powershell
docker compose logs --tail 100
```

Follow API logs:

```powershell
docker compose logs -f api
```

Follow database logs:

```powershell
docker compose logs -f db
```

Follow Nginx logs:

```powershell
docker compose logs -f nginx
```

### Common problems

| Problem | Investigation |
|---|---|
| API is unhealthy | Inspect API logs and health endpoint |
| Database is unhealthy | Inspect PostgreSQL logs and credentials |
| HTTPS is unavailable | Inspect Nginx logs and certificate mounts |
| HTTP does not redirect | Inspect Nginx configuration |
| Database connection fails | Verify DATABASE_URL and database health |
| Port already in use | Identify the process using ports 80, 443, 3000, or 5432 |

Useful commands:

```powershell
docker compose ps
docker inspect reservio-api
docker inspect reservio-db
docker logs reservio-nginx
```

## 5. Restart and Recovery

If the API becomes unhealthy:

```powershell
docker compose restart api
```

If Nginx becomes unhealthy:

```powershell
docker compose restart nginx
```

If the database becomes unhealthy, inspect its logs before restarting:

```powershell
docker logs reservio-db
docker compose restart db
```

After recovery, verify:

```powershell
docker compose ps
curl.exe -k https://127.0.0.1/api/health
curl.exe -k https://127.0.0.1/api/ready
```

Do not remove the database volume while troubleshooting.

## 6. Database Backup

Create a backup directory if it does not exist:

```powershell
New-Item -ItemType Directory -Force backups
```

Create a timestamped PostgreSQL custom-format backup:

```powershell
$backupFile = "backups\reservio-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"

docker exec reservio-db pg_dump -U reservio_user -d reservio_db -Fc -f /tmp/reservio.dump

docker cp reservio-db:/tmp/reservio.dump $backupFile

Write-Host "Backup created: $backupFile"
```

Inspect the backup:

```powershell
docker cp $backupFile reservio-db:/tmp/reservio-backup.dump

docker exec reservio-db pg_restore --list /tmp/reservio-backup.dump
```

Store backups securely and do not commit them to Git.

## 7. Database Restore Verification

First, create a separate test database:

```powershell
docker exec reservio-db createdb -U reservio_user reservio_restore_test
```

Copy the backup into the database container:

```powershell
docker cp $backupFile reservio-db:/tmp/reservio-backup.dump
```

Restore into the test database:

```powershell
docker exec reservio-db pg_restore -U reservio_user -d reservio_restore_test --no-owner --exit-on-error /tmp/reservio-backup.dump
```

Verify restored room records:

```powershell
docker exec reservio-db psql -U reservio_user -d reservio_restore_test -c "SELECT COUNT(*) FROM rooms;"
```

Verify restored reservations:

```powershell
docker exec reservio-db psql -U reservio_user -d reservio_restore_test -c "SELECT COUNT(*) FROM reservations;"
```

The restore procedure has previously been tested successfully with six rooms, three reservations, and the overlap-prevention constraint.

**Important:** This procedure restores into a separate database. It does not replace the live database.

## 8. Application Rollback

If a newly deployed application image causes problems:

1. Identify the previously working image tag in GHCR.
2. Update the API image tag in `docker-compose.yml`.
3. Pull the selected image:

```powershell
docker compose pull api
```

4. Recreate the API and Nginx services:

```powershell
docker compose up -d api nginx
```

5. Verify health and readiness:

```powershell
curl.exe -k https://127.0.0.1/api/health
curl.exe -k https://127.0.0.1/api/ready
```

Rollback should use a known working version tag, not an unverified image.

Application rollback does not automatically reverse database schema changes. Restore a database backup only after evaluating the impact and confirming the recovery plan.

## 9. Security Notes

- Never commit `.env` files or credentials.
- Never commit TLS private keys.
- Keep backups outside version control.
- Keep database ports restricted to trusted interfaces.
- Use trusted TLS certificates for public deployments.
- Avoid deleting Docker volumes during routine recovery.
- Review logs for database connection failures and unexpected errors.

## 10. Recovery Evidence

The following recovery activities have been demonstrated during project development:

- Docker services started successfully.
- API health and database readiness checks returned successful responses.
- HTTP requests redirected to HTTPS.
- PostgreSQL backup was created and inspected.
- Backup was restored into a separate test database.
- Restored room and reservation records were verified.
- The overlap-prevention database constraint was present after restoration.

## 11. Operational Principle

Always investigate logs and service health before making changes. Preserve database volumes, validate recovery using a separate database where possible, and verify application health after every deployment or rollback.