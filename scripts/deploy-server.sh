#!/usr/bin/env bash
# 在腾讯云服务器 /var/www/plan 下执行：bash scripts/deploy-server.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart kebiaoplan || pm2 start npm --name kebiaoplan -- start
pm2 save
curl -sf http://127.0.0.1:3000/api/health && echo " OK"
