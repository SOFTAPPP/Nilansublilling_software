#!/bin/bash
# ============================================================
#  Nilanshu Billing - VPS PostgreSQL Setup Script
#  Run this on the VPS: ssh root@72.61.231.155
# ============================================================

set -e

echo "============================================"
echo "  NILANSHU BILLING - VPS DATABASE SETUP"
echo "============================================"
echo ""

# Step 1: Find PostgreSQL config directory
PG_VERSION=$(ls /etc/postgresql/ | head -1)
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

echo "[1/5] PostgreSQL version: $PG_VERSION"
echo "       Config: $PG_CONF"
echo "       HBA:    $PG_HBA"
echo ""

# Step 2: Enable remote listening
echo "[2/5] Configuring PostgreSQL to listen on all interfaces..."
if grep -q "^listen_addresses" "$PG_CONF"; then
  sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
else
  sed -i "s/^#listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
fi
echo "       Done: listen_addresses = '*'"
echo ""

# Step 3: Add pg_hba.conf entry for remote access
echo "[3/5] Adding remote access rule to pg_hba.conf..."
if ! grep -q "npbilling_user" "$PG_HBA"; then
  echo "" >> "$PG_HBA"
  echo "# Nilanshu Billing Software - Remote Access" >> "$PG_HBA"
  echo "host    npsoftwaredatabase    npbilling_user    0.0.0.0/0    scram-sha-256" >> "$PG_HBA"
  echo "       Done: Added remote access rule"
else
  echo "       Rule already exists, skipping"
fi
echo ""

# Step 4: Create database and user
echo "[4/5] Creating database and user..."
sudo -u postgres psql -c "SELECT 'CREATE DATABASE npsoftwaredatabase' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'npsoftwaredatabase')\gexec"

sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'npbilling_user') THEN CREATE USER npbilling_user WITH PASSWORD 'Aritradutta@2005'; ELSE ALTER USER npbilling_user WITH PASSWORD 'Aritradutta@2005'; END IF; END \$\$;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE npsoftwaredatabase TO npbilling_user;"

sudo -u postgres psql -d npsoftwaredatabase -c "GRANT ALL ON SCHEMA public TO npbilling_user;"
sudo -u postgres psql -d npsoftwaredatabase -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO npbilling_user;"
sudo -u postgres psql -d npsoftwaredatabase -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO npbilling_user;"
sudo -u postgres psql -d npsoftwaredatabase -c "GRANT CREATE ON SCHEMA public TO npbilling_user;"

echo "       Done: Database and user created"
echo ""

# Step 5: Open firewall and restart
echo "[5/5] Opening firewall port 5432 and restarting PostgreSQL..."
ufw allow 5432/tcp || true
ufw reload || true
systemctl restart postgresql
echo "       Done: Firewall and PostgreSQL restarted"
echo ""

echo "============================================"
echo "  VPS DATABASE SETUP COMPLETE!"
echo "============================================"
echo ""
echo "Connection URL:"
echo "  postgres://npbilling_user:Aritradutta%402005@72.61.231.155:5432/npsoftwaredatabase"
echo ""
echo "Next steps (run on your local PC):"
echo "  1. cd backend"
echo "  2. npx prisma db push"
echo "  3. node prisma/seed.js"
echo "  4. node seed.js"
echo "  5. node import_stock.js"
