#!/usr/bin/env bash
# Trouve le dernier déploiement stable AVANT la version en ligne : en remontant
# l'historique de main depuis le commit en ligne, le premier merge dont la
# pipeline CI/CD (ci.yml, push sur main) est verte, smoke tests compris.
#
#   API_URL=https://… bash scripts/last-stable.sh [commit-en-ligne]
#
# Sans argument, le commit en ligne est lu dans GET /health ("version").
# Affiche le SHA complet du commit à remettre en ligne.
set -euo pipefail

REPO=${GITHUB_REPOSITORY:-rparone2iim/pokemon-wishlist}
MAIN=${MAIN_REF:-origin/main}
current=${1:-$(curl -sf "${API_URL:?API_URL manquant}/health" | jq -r .version)}

if [ -z "$current" ] || [ "$current" = dev ] || [ "$current" = null ]; then
  echo "Version en ligne inconnue (« $current »)" >&2
  exit 1
fi

# Les commits de main dont la pipeline est verte (du plus récent au plus ancien)
green=$(gh run list -R "$REPO" --workflow ci.yml --branch main --event push \
  --status success --limit 200 --json headSha --jq '.[].headSha')

# L'historique de main, merge par merge (first-parent), du plus récent au plus ancien
seen=0
for sha in $(git rev-list --first-parent "$MAIN"); do
  if [ "$seen" = 0 ]; then
    case $sha in "$current"*) seen=1 ;; esac
    continue
  fi
  if grep -qx "$sha" <<<"$green"; then
    # Un rollback rejoue la CD actuelle (deploy.yml) sur ce commit : il doit
    # savoir afficher sa version (APP_VERSION), sinon les contrôles échoueraient
    if ! git grep -q APP_VERSION "$sha" -- apps/web/nuxt.config.ts; then
      echo "Dernier déploiement stable trop ancien pour un rollback : ${sha::7}" >&2
      exit 1
    fi
    echo "En ligne : ${current::7} · dernier déploiement stable avant : ${sha::7} ($(git log -1 --format=%s "$sha"))" >&2
    echo "$sha"
    exit 0
  fi
done

if [ "$seen" = 0 ]; then
  echo "Le commit en ligne ${current::7} n'est pas dans l'historique de $MAIN" >&2
else
  echo "Aucun déploiement stable avant ${current::7}" >&2
fi
exit 1
