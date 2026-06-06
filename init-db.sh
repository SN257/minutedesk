#!/bin/bash
set -e

# If old 'minutedesk' database exists, rename it to 'nexus'
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'Checking for old database...' AS status;
  DO \$\$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'minutedesk') THEN
      -- Terminate connections to old database
      PERFORM pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'minutedesk' AND pid <> pg_backend_pid();
      -- Rename old database to new name
      ALTER DATABASE minutedesk RENAME TO nexus;
      RAISE NOTICE 'Database renamed from minutedesk to nexus';
    END IF;
  END
  \$\$;
EOSQL
