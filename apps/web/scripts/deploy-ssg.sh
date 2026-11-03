#!/usr/bin/env bash
# Publie le front en statique (SSG) sur S3, derrière CloudFront.
# Le script peut être relancé : il crée ce qui manque et met le reste à jour.
#
#   npm run deploy:ssg -w apps/web
#
# Variables :
#   NUXT_PUBLIC_API_BASE  l'API AWS (Lambda) utilisée par le site et ses fiches
#   PRERENDER_POKEMON     fiches prégénérées (151 par défaut)
#   SKIP_GENERATE=1       envoyer le dossier .output/public déjà généré (CI)
#   AWS_REGION            eu-west-3 (Paris) par défaut
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=pokewishlist-ssg
REGION=${AWS_REGION:-$(aws configure get region || echo eu-west-3)}
export AWS_REGION=$REGION AWS_PAGER=""
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET=${SSG_BUCKET:-$NAME-$ACCOUNT}
export NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE:-https://ds5i6cov6l.execute-api.eu-west-3.amazonaws.com}
export PRERENDER_POKEMON=${PRERENDER_POKEMON:-151}

if [ "${SKIP_GENERATE:-}" != 1 ]; then
  echo "→ Génération statique (nuxt generate, $PRERENDER_POKEMON fiches)"
  npx nuxt generate > /dev/null
fi
test -f .output/public/index.html && test -f .output/public/200.html

echo "→ Bucket S3 $BUCKET (privé)"
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  aws s3api create-bucket --bucket "$BUCKET" \
    --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "→ Accès CloudFront → S3 (OAC)"
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$NAME'].Id | [0]" --output text)
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)
fi

echo "→ Fonction CloudFront (/pokemon/pikachu → /pokemon/pikachu/index.html)"
FUNCTION_CODE=$(mktemp)
trap 'rm -f "$FUNCTION_CODE"' EXIT
cat > "$FUNCTION_CODE" <<'JS'
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) request.uri += 'index.html';
  else if (uri.split('/').pop().indexOf('.') === -1) request.uri += '/index.html';
  return request;
}
JS
if ETAG=$(aws cloudfront describe-function --name "$NAME-index" --query ETag --output text 2>/dev/null); then
  ETAG=$(aws cloudfront update-function --name "$NAME-index" --if-match "$ETAG" \
    --function-config "Comment=Pages statiques en dossiers,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$FUNCTION_CODE" --query ETag --output text)
else
  ETAG=$(aws cloudfront create-function --name "$NAME-index" \
    --function-config "Comment=Pages statiques en dossiers,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$FUNCTION_CODE" --query ETag --output text)
fi
aws cloudfront publish-function --name "$NAME-index" --if-match "$ETAG" >/dev/null
FUNCTION_ARN=$(aws cloudfront describe-function --name "$NAME-index" --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN --output text)

echo "→ Distribution CloudFront"
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$NAME'].Id | [0]" --output text)
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  CONFIG=$(mktemp)
  # Cache « CachingOptimized » géré par AWS ; pages manquantes (fiches non
  # prégénérées) → 200.html, l'appli Nuxt les affiche via l'API.
  cat > "$CONFIG" <<JSON
{
  "CallerReference": "$NAME-$(date +%s)",
  "Comment": "$NAME",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "s3", "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "FunctionAssociations": { "Quantity": 1, "Items": [
      { "EventType": "viewer-request", "FunctionARN": "$FUNCTION_ARN" }
    ]}
  },
  "CustomErrorResponses": { "Quantity": 2, "Items": [
    { "ErrorCode": 403, "ResponsePagePath": "/200.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 },
    { "ErrorCode": 404, "ResponsePagePath": "/200.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 }
  ]}
}
JSON
  DIST_ID=$(aws cloudfront create-distribution --distribution-config "file://$CONFIG" \
    --query Distribution.Id --output text)
  rm -f "$CONFIG"
fi
DIST_ARN="arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID"
DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)

echo "→ Seul CloudFront peut lire le bucket"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"CloudFrontLecture\",
    \"Effect\": \"Allow\",
    \"Principal\": { \"Service\": \"cloudfront.amazonaws.com\" },
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET/*\",
    \"Condition\": { \"StringEquals\": { \"AWS:SourceArn\": \"$DIST_ARN\" } }
  }]
}"

echo "→ Envoi des fichiers sur S3"
# Fichiers du build (noms avec empreinte) : gardés en cache un an
aws s3 sync .output/public/_nuxt "s3://$BUCKET/_nuxt" --delete --only-show-errors \
  --cache-control "public, max-age=31536000, immutable"
# Pages et données : toujours revalidées
aws s3 sync .output/public "s3://$BUCKET" --delete --only-show-errors \
  --exclude "_nuxt/*" --cache-control "public, max-age=0, must-revalidate"

echo "→ Invalidation du cache CloudFront"
INVALIDATION=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths "/*" --query Invalidation.Id --output text)

echo "Site statique : https://$DOMAIN"
echo "  bucket $BUCKET · distribution $DIST_ID · invalidation $INVALIDATION"
