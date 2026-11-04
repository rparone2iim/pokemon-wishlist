#!/usr/bin/env bash
# Prépare le CD de l'API : GitHub Actions peut mettre à jour le code de la
# Lambda, sans aucune clé AWS stockée dans GitHub (OIDC).
#
#   bash apps/api/scripts/setup-api-cd.sh
#
# Crée (ou met à jour) :
#   - le fournisseur OIDC de GitHub dans IAM (token.actions.githubusercontent.com)
#   - le rôle pokewishlist-github-api-deploy, que seul ce dépôt peut endosser,
#     depuis l'environnement GitHub « production-api » (donc depuis main)
#   - ses droits : remplacer le code de la Lambda pokewishlist-api, rien d'autre
#     (ni sa configuration, donc ni DATABASE_URL, ni son rôle, ni API Gateway)
#   - les variables GitHub AWS_API_ROLE_ARN et LAMBDA_FUNCTION_NAME
set -euo pipefail
export AWS_PAGER=""

REPO=${GITHUB_REPO:-rparone2iim/pokemon-wishlist}
ROLE=pokewishlist-github-api-deploy
NAME=pokewishlist-api
REGION=${AWS_REGION:-eu-west-3}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
FUNCTION_ARN=arn:aws:lambda:$REGION:$ACCOUNT:function:$NAME
PROVIDER=arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com
# Format du « sub » des jetons GitHub : le dépôt peut utiliser le format immuable
# (repo:owner@id/repo@id), qu'on lit via l'API GitHub ; l'ancien format reste accepté.
PREFIX=$(gh api "repos/$REPO/actions/oidc/customization/sub" --jq .sub_claim_prefix 2>/dev/null || true)
PREFIX=${PREFIX:-repo:$REPO}

echo "→ Fournisseur OIDC de GitHub"
aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER" >/dev/null 2>&1 ||
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com >/dev/null

echo "→ Rôle $ROLE (endossable seulement par $REPO, environnement production-api)"
TRUST=$(cat <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Federated":"$PROVIDER"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{"StringEquals":{
    "token.actions.githubusercontent.com:aud":"sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub":[
      "$PREFIX:environment:production-api",
      "repo:$REPO:environment:production-api"]}}}]}
JSON
)
if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "$TRUST"
else
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$TRUST" \
    --description "GitHub Actions : deploie le code de l'API PokeWishlist sur Lambda" >/dev/null
fi

echo "→ Droits : code de la fonction $NAME uniquement"
POLICY=$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"DeployerLeCode","Effect":"Allow",
   "Action":["lambda:UpdateFunctionCode","lambda:GetFunction","lambda:GetFunctionConfiguration"],
   "Resource":"$FUNCTION_ARN"}
]}
JSON
)
aws iam put-role-policy --role-name "$ROLE" --policy-name deployer-code-api \
  --policy-document "$POLICY"

echo "→ Variables GitHub et environnement production-api"
gh api -X PUT "repos/$REPO/environments/production-api" >/dev/null
gh variable set AWS_API_ROLE_ARN --repo "$REPO" --body "arn:aws:iam::$ACCOUNT:role/$ROLE"
gh variable set LAMBDA_FUNCTION_NAME --repo "$REPO" --body "$NAME"

echo "Rôle prêt : arn:aws:iam::$ACCOUNT:role/$ROLE"
