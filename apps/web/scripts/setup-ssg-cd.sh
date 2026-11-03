#!/usr/bin/env bash
# Prépare le CD du site statique : GitHub Actions peut publier sur S3 et
# invalider CloudFront, sans aucune clé AWS stockée dans GitHub (OIDC).
#
#   bash apps/web/scripts/setup-ssg-cd.sh
#
# Crée (ou met à jour) :
#   - le fournisseur OIDC de GitHub dans IAM (token.actions.githubusercontent.com)
#   - le rôle pokewishlist-github-ssg-deploy, que seul ce dépôt peut endosser,
#     depuis l'environnement GitHub « production-ssg » (donc depuis main)
#   - ses droits : écrire dans le bucket du site et invalider sa distribution, rien d'autre
set -euo pipefail
export AWS_PAGER=""

REPO=${GITHUB_REPO:-rparone2iim/pokemon-wishlist}
ROLE=pokewishlist-github-ssg-deploy
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET=${SSG_BUCKET:-pokewishlist-ssg-$ACCOUNT}
DIST=${SSG_DISTRIBUTION_ID:-$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='pokewishlist-ssg'].Id | [0]" --output text)}
PROVIDER=arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com

echo "→ Fournisseur OIDC de GitHub"
aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER" >/dev/null 2>&1 ||
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com >/dev/null

echo "→ Rôle $ROLE (endossable seulement par $REPO, environnement production-ssg)"
TRUST=$(cat <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Federated":"$PROVIDER"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{"StringEquals":{
    "token.actions.githubusercontent.com:aud":"sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub":"repo:$REPO:environment:production-ssg"}}}]}
JSON
)
if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "$TRUST"
else
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$TRUST" \
    --description "GitHub Actions : publie le site statique PokeWishlist" >/dev/null
fi

echo "→ Droits : bucket $BUCKET et distribution $DIST uniquement"
POLICY=$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"ListerLeBucket","Effect":"Allow","Action":"s3:ListBucket","Resource":"arn:aws:s3:::$BUCKET"},
  {"Sid":"EcrireLeSite","Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":"arn:aws:s3:::$BUCKET/*"},
  {"Sid":"InvaliderLeCache","Effect":"Allow","Action":["cloudfront:CreateInvalidation","cloudfront:GetInvalidation"],"Resource":"arn:aws:cloudfront::$ACCOUNT:distribution/$DIST"}
]}
JSON
)
aws iam put-role-policy --role-name "$ROLE" --policy-name publier-site-statique \
  --policy-document "$POLICY"

echo "Rôle prêt : arn:aws:iam::$ACCOUNT:role/$ROLE"
