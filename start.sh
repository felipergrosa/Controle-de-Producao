#!/bin/bash
export DATABASE_URL="mysql://root@localhost:3306/production_control"
export NODE_ENV=development
export PORT=5000

cd /home/ubuntu
pnpm dev
