# Deployment Guide

## Requirements

- Docker Engine with Docker Compose v2.
- Git, if cloning the repository.
- Free host port selected by `APP_PORT` (3000 by default).
- The Compose setup runs the API and MySQL 8.4 in containers; Node.js and MySQL
  do not need to be installed on the host.

## Setup steps

From the repository root, run these two commands:

```sh
cp .env.example .env
docker compose up -d --build
```

The first MySQL startup creates the schema and loads `db/init/01-seed.sql`.
The app's startup initializer reapplies the seed and imports the sample CSV files.
Re-running `docker compose exec app npm run db:init` reapplies the SQL seed and
CSV import safely; it does not add duplicate sample inventory or imported
transactions.

To stop the services without deleting database data:

```sh
docker compose down
```

To remove the local database volume as well, use `docker compose down -v`.

## Environment variables

Copy `.env.example` to `.env`. The checked-in sample values are for local
development only. Replace all `change_this_*` values before exposing the
application to another machine or deploying it.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `APP_PORT` | No | `3000` | Host and container HTTP port; the Compose port mapping uses this value. |
| `DB_HOST` | No | `db` | MySQL service name inside the Compose network. |
| `DB_PORT` | No | `3306` | MySQL port. |
| `DB_NAME` | No | `smartcrm` | Application database created by the MySQL image. |
| `DB_USER` | No | `smartcrm_app` | Non-root MySQL account used by the app. |
| `DB_PASSWORD` | Yes | Sample placeholder | Password for `DB_USER`. |
| `DB_ROOT_PASSWORD` | Yes | Sample placeholder | MySQL root password, used only by the database container. |
| `DB_CREATE_DATABASE` | No | `false` | Kept false in Compose because the MySQL image creates the database. |
| `AUTH_USERNAME` | No | `admin` | Shared SmartCRM login username. |
| `AUTH_PASSWORD` | Yes | Sample placeholder | Shared SmartCRM login password. |
| `FRONTEND_ORIGINS` | No | Localhost origins | Allowed browser origins for credentialed CORS requests. |
| `FRONTEND_PORT` | No | `5173` | Used only by the separate local frontend development server, not Compose. |

`AUTH_PASSWORD` must be a non-empty value. Use distinct, strong values for the
database and application credentials. Do not copy `.env` into source control.

## Sample data

`db/init/01-seed.sql` creates `DEMO-PART-001`, `DEMO-CENTER`, and an inventory
row with quantity 10. Its `ON DUPLICATE KEY UPDATE` clauses make it safe to
apply more than once. The app initializer also imports the checked-in
`data/imports/` CSV files, while `imported_transaction_source` prevents duplicate
CSV transactions on later starts.

## Verify it works

Run the app and database health checks:

```sh
docker compose ps
curl -s "http://localhost:${APP_PORT:-3000}/health"
docker compose exec app npm test
```

Both Compose services should show `healthy`; the health endpoint returns
`{"status":"ok"}`. Jest exits with code 0 when tests pass. MySQL integration
tests require a separate disposable database with the `TEST_DB_*` variables
documented in the root README; without that configuration Jest skips those
integration cases. The recorded MySQL test run is documented in
[`test-report.md`](./test-report.md).

To verify seed repeatability on the running stack, run the app initializer a
second time and compare the `DEMO-PART-001` inventory row count before and
after. It remains one row; `npm run db:init` also reports the number of CSV
transactions newly imported (zero on a repeat run).

## API reference

See [`api-contract.md`](./api-contract.md) for all implemented routes,
authentication requirements, request and response contracts, and error codes.

## Security checklist

Each item and its evidence is recorded in
[`checklist-bao-mat.md`](./checklist-bao-mat.md).


## Verify it works
Verify that the application and database containers are healthy:

docker compose ps
Expected result:

app   Up (healthy)
db    Up (healthy)
Verify the application health endpoint:

curl http://localhost:3000/health
Response:

{
  "status": "ok"
}
The successful health check confirms that the SmartCRM application is running correctly and can communicate with the MySQL database.