#!/usr/bin/env bash
# Déploie l'API Hono sur AWS Lambda, derrière une API HTTP d'API Gateway.
# Le script peut être relancé : il crée ce qui manque et met le reste à jour.
#
#   npm run deploy:lambda -w apps/api
#
# Variables (lues dans apps/api/.env si elles n'existent pas déjà) :
#   DATABASE_URL         base Supabase (pooler en mode transaction, port 6543, conseillé pour Lambda)
#   LAMBDA_DATABASE_URL  si l'adresse de la base doit être différente de DATABASE_URL
#   LAMBDA_CORS_ORIGIN   origine(s) du front autorisée(s) sur AWS, séparées par des virgules
#                        (le front Vercel et le dev local) ; sinon CORS_ORIGIN
#   AWS_REGION           eu-west-3 (Paris) par défaut
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; . ./.env; set +a; fi

NAME=pokewishlist-api
ROLE=pokewishlist-api-lambda
REGION=${AWS_REGION:-$(aws configure get region || echo eu-west-3)}
DB_URL=${LAMBDA_DATABASE_URL:-${DATABASE_URL:?DATABASE_URL manquant (voir .env.example)}}
CORS=${LAMBDA_CORS_ORIGIN:-${CORS_ORIGIN:-http://localhost:3000}}
export AWS_REGION=$REGION AWS_PAGER=""

echo "→ Paquet Lambda"
npm run build:lambda --silent
(cd dist-lambda && rm -f function.zip && zip -qr function.zip lambda db)

echo "→ Rôle IAM $ROLE"
if ! ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text 2>/dev/null); then
  ROLE_ARN=$(aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
    --query Role.Arn --output text)
  # Droits minimum : écrire ses logs dans CloudWatch
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "  (attente de la propagation du rôle)"; sleep 10
fi

# Les variables sont passées dans un fichier : le mot de passe n'apparaît pas dans la ligne de commande
ENV_FILE=$(mktemp)
trap 'rm -f "$ENV_FILE"' EXIT
node -e 'const [db, cors] = process.argv.slice(1); console.log(JSON.stringify({ Variables: { DATABASE_URL: db, CORS_ORIGIN: cors } }))' \
  "$DB_URL" "$CORS" > "$ENV_FILE"

echo "→ Fonction Lambda $NAME ($REGION)"
if aws lambda get-function --function-name "$NAME" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$NAME" \
    --zip-file fileb://dist-lambda/function.zip >/dev/null
  aws lambda wait function-updated --function-name "$NAME"
  aws lambda update-function-configuration --function-name "$NAME" \
    --environment "file://$ENV_FILE" >/dev/null
else
  aws lambda create-function --function-name "$NAME" \
    --runtime nodejs22.x --architectures arm64 \
    --handler lambda/index.handler --role "$ROLE_ARN" \
    --zip-file fileb://dist-lambda/function.zip \
    --memory-size 512 --timeout 15 \
    --environment "file://$ENV_FILE" >/dev/null
fi
aws lambda wait function-updated --function-name "$NAME"
FUNCTION_ARN=$(aws lambda get-function --function-name "$NAME" --query Configuration.FunctionArn --output text)

echo "→ API Gateway (API HTTP) $NAME"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$NAME'].ApiId | [0]" --output text)
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  # Création rapide : une route par défaut ($default) qui envoie tout à la Lambda.
  # Le CORS est géré par Hono (CORS_ORIGIN), pas par API Gateway.
  API_ID=$(aws apigatewayv2 create-api --name "$NAME" --protocol-type HTTP \
    --target "$FUNCTION_ARN" --query ApiId --output text)
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
  aws lambda add-permission --function-name "$NAME" \
    --statement-id apigateway-invoke --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT:$API_ID/*" >/dev/null
fi
URL=$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint --output text)

echo "→ Vérification (une nouvelle API met quelques secondes à répondre)"
for _ in $(seq 1 30); do
  if HEALTH=$(curl -sf "$URL/health"); then break; fi
  sleep 2
done
echo "  GET /health : ${HEALTH:?API injoignable}"
echo "API déployée : $URL"
