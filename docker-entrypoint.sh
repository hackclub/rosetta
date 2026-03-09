#!/bin/sh
set -e

echo "Generating & Pushing DB schema..."
bunx drizzle-kit generate
bunx drizzle-kit push

echo "Booting up Rosetta..!"
exec bun run src/index.ts