#!/usr/bin/env bash
# Runs ON the production server (installed at /opt/tkwp/deploy.sh).
# Called by the GitHub Actions deploy workflow: deploy.sh <image-tag>
# Pulls the given image tag, restarts the stack, health-checks it, and
# rolls back to the previously deployed tag if the app doesn't come up.
set -euo pipefail

TAG="${1:?usage: deploy.sh <image-tag>}"
cd /opt/tkwp

PREV="$(grep -oP '(?<=^IMAGE_TAG=).*' .env || true)"
sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${TAG}|" .env

docker compose pull web
docker compose up -d --remove-orphans

echo "Waiting for /api/health ..."
ok=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 5
done

if [ "$ok" != "1" ]; then
  echo "Deploy of ${TAG} unhealthy after 150s" >&2
  docker compose logs --tail 100 web >&2 || true
  if [ -n "$PREV" ] && [ "$PREV" != "$TAG" ]; then
    echo "Rolling back to ${PREV}" >&2
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${PREV}|" .env
    docker compose up -d
  fi
  exit 1
fi

docker image prune -f >/dev/null
echo "Deployed ${TAG}"
