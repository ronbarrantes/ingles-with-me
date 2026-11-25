#!/bin/sh
# Vercel build. With CONVEX_DEPLOY_KEY set, push the Convex functions first
# (and the shared secret, from CONVEX_APP_SECRET), then build the app.
# Without it, just build: the app runs without a database.
set -e
if [ -n "$CONVEX_DEPLOY_KEY" ]; then
  if [ -n "$CONVEX_APP_SECRET" ]; then
    npx convex env set APP_SECRET "$CONVEX_APP_SECRET"
  fi
  npx convex deploy --cmd "pnpm build"
else
  pnpm build
fi
