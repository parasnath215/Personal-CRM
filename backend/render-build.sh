#!/usr/bin/env bash
set -o errexit

echo "Running backend build script..."

npm install
npx prisma generate
npx prisma db push

echo "Backend build completed successfully."
