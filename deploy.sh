#!/bin/bash

# ===========================================
# WP-Affiliate Auto Deploy Script
# ===========================================

set -e

# Configuration (sunucuya göre düzenlenecek)
APP_DIR="${APP_DIR:-/var/www/wp-affiliate}"
BRANCH="${BRANCH:-main}"
PHP_PATH="${PHP_PATH:-php}"
COMPOSER_PATH="${COMPOSER_PATH:-composer}"
NPM_PATH="${NPM_PATH:-npm}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Start
log "Starting deployment..."
cd "$APP_DIR" || error "App directory not found: $APP_DIR"

# Maintenance mode
log "Enabling maintenance mode..."
$PHP_PATH artisan down --retry=60 || true

# Pull latest changes
log "Pulling latest changes from $BRANCH..."
git fetch origin
git reset --hard origin/$BRANCH

# Install PHP dependencies
log "Installing Composer dependencies..."
$COMPOSER_PATH install --no-dev --optimize-autoloader --no-interaction

# Install Node dependencies & build
log "Installing NPM dependencies..."
$NPM_PATH ci --production=false

log "Building frontend assets..."
$NPM_PATH run build

# Laravel optimizations
log "Running Laravel optimizations..."
$PHP_PATH artisan config:cache
$PHP_PATH artisan route:cache
$PHP_PATH artisan view:cache
$PHP_PATH artisan event:cache

# Run migrations
log "Running database migrations..."
$PHP_PATH artisan migrate --force

# Clear old caches
log "Clearing application cache..."
$PHP_PATH artisan cache:clear

# Restart queue workers (if using supervisor)
if command -v supervisorctl &> /dev/null; then
    log "Restarting queue workers..."
    supervisorctl restart wp-affiliate-worker:* || warn "Supervisor not configured for this app"
fi

# Set permissions
log "Setting permissions..."
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache

# Disable maintenance mode
log "Disabling maintenance mode..."
$PHP_PATH artisan up

log "=========================================="
log "Deployment completed successfully!"
log "=========================================="
