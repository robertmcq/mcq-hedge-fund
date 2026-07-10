#!/usr/bin/env bash
# =============================================================================
# MCQ Hedge Fund — AWS Full Bootstrap Script
# Run from: AWS CloudShell OR GitHub Codespace
#
# Usage:
#   bash infrastructure/bootstrap.sh
#
# Prerequisites (CloudShell — zero install needed):
#   AWS CLI pre-installed, credentials = current console session
#
# Prerequisites (GitHub Codespace):
#   aws configure  (enter key ID, secret, region=us-east-1, output=json)
#
# What this script provisions:
#   1. ECR repository
#   2. Secrets Manager placeholders for all required secrets
#   3. IAM execution + task roles
#   4. CloudWatch log group
#   5. RDS Postgres instance (or prints manual instructions if using existing)
#   6. ECS cluster + task definition registration
# =============================================================================

set -euo pipefail

REGION="us-east-1"
ACCOUNT="553963239666"
APP="mcq-hedge-fund"
CLUSTER="mcq-cluster"
LOG_GROUP="/ecs/${APP}"

echo ""
echo "================================================================"
echo "  MCQ Ventures — AWS Bootstrap: ${APP}"
echo "  Account: ${ACCOUNT} | Region: ${REGION}"
echo "================================================================"
echo ""

# -----------------------------------------------------------------------------
# 1. ECR Repository
# -----------------------------------------------------------------------------
echo "[1/6] Creating ECR repository..."
aws ecr describe-repositories --repository-names "${APP}" --region "${REGION}" > /dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "${APP}" \
    --image-scanning-configuration scanOnPush=true \
    --region "${REGION}"
echo "      ECR: ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${APP}"

# -----------------------------------------------------------------------------
# 2. Secrets Manager — create placeholders for all required secrets
# -----------------------------------------------------------------------------
echo "[2/6] Creating Secrets Manager placeholders..."

SECRETS=(
  "MCQ_HEDGE_FUND_API_KEY"
  "MCQ_HEDGE_FUND_DATABASE_URL"
  "KALSHI_API_KEY_ID"
  "KALSHI_PRIVATE_KEY_PEM"
  "KALSHI_TICKERS"
)

for SECRET_NAME in "${SECRETS[@]}"; do
  aws secretsmanager describe-secret --secret-id "${SECRET_NAME}" --region "${REGION}" > /dev/null 2>&1 || \
    aws secretsmanager create-secret \
      --name "${SECRET_NAME}" \
      --secret-string "PLACEHOLDER_REPLACE_IN_CONSOLE" \
      --region "${REGION}"
  echo "      ✓ ${SECRET_NAME}"
done

echo ""
echo "      ACTION REQUIRED: Set actual values in AWS Console → Secrets Manager:"
echo "        MCQ_HEDGE_FUND_API_KEY          — generate a strong random key (openssl rand -hex 32)"
echo "        MCQ_HEDGE_FUND_DATABASE_URL     — postgresql://user:pass@rds-host:5432/mcq_fund?sslmode=require"
echo "        KALSHI_API_KEY_ID               — your Kalshi production key ID"
echo "        KALSHI_PRIVATE_KEY_PEM          — paste full RSA PEM (newlines as \\n)"
echo "        KALSHI_TICKERS                  — comma-separated tickers"
echo ""

# -----------------------------------------------------------------------------
# 3. IAM Roles
# -----------------------------------------------------------------------------
echo "[3/6] Creating IAM roles..."

EXEC_ROLE="mcq-hedge-fund-execution-role"
TASK_ROLE="mcq-hedge-fund-task-role"

TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam get-role --role-name "${EXEC_ROLE}" > /dev/null 2>&1 || \
  aws iam create-role --role-name "${EXEC_ROLE}" --assume-role-policy-document "${TRUST}"
aws iam attach-role-policy --role-name "${EXEC_ROLE}" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam get-role --role-name "${TASK_ROLE}" > /dev/null 2>&1 || \
  aws iam create-role --role-name "${TASK_ROLE}" --assume-role-policy-document "${TRUST}"

TASK_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:MCQ_HEDGE_FUND*"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:KALSHI*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:${LOG_GROUP}:*"
    }
  ]
}
EOF
)
aws iam put-role-policy \
  --role-name "${TASK_ROLE}" \
  --policy-name mcq-hedge-fund-task-policy \
  --policy-document "${TASK_POLICY}"
echo "      IAM roles created and policies attached."

# -----------------------------------------------------------------------------
# 4. CloudWatch Log Group
# -----------------------------------------------------------------------------
echo "[4/6] Creating CloudWatch log group..."
aws logs create-log-group --log-group-name "${LOG_GROUP}" --region "${REGION}" 2>/dev/null || true
aws logs put-retention-policy \
  --log-group-name "${LOG_GROUP}" \
  --retention-in-days 30 \
  --region "${REGION}"
echo "      Log group: ${LOG_GROUP} (30-day retention)"

# -----------------------------------------------------------------------------
# 5. RDS Postgres (print instructions — RDS creation is interactive)
# -----------------------------------------------------------------------------
echo "[5/6] RDS Postgres — manual step required:"
echo ""
echo "      Create an RDS Postgres instance in the AWS Console:"
echo "        Engine:        PostgreSQL 16"
echo "        Template:      Production (Multi-AZ)"
echo "        DB name:       mcq_fund"
echo "        Username:      mcq_user"
echo "        Instance:      db.t3.micro (dev) or db.t3.small (prod)"
echo "        Storage:       20 GB gp3"
echo "        VPC:           same VPC as your ECS cluster"
echo "        Public access: No"
echo "      After creation, update MCQ_HEDGE_FUND_DATABASE_URL in Secrets Manager."
echo ""

# -----------------------------------------------------------------------------
# 6. ECS Cluster + Task Definition
# -----------------------------------------------------------------------------
echo "[6/6] Registering ECS task definition and ensuring cluster..."

aws ecs describe-clusters --clusters "${CLUSTER}" --region "${REGION}" \
  --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE || \
  aws ecs create-cluster --cluster-name "${CLUSTER}" --region "${REGION}"

aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs-task-definition.json \
  --region "${REGION}"

echo ""
echo "================================================================"
echo "  Bootstrap complete — ${APP}"
echo ""
echo "  NEXT STEPS:"
echo "  1. Fill all Secrets Manager placeholders (see Step 2 above)"
echo "  2. Provision RDS Postgres (see Step 5 above)"
echo "  3. Build + push Docker image (run from Codespace with Docker):"
echo ""
echo "     aws ecr get-login-password --region ${REGION} | \\"
echo "       docker login --username AWS --password-stdin \\"
echo "       ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
echo ""
echo "     docker build -t ${APP} ."
echo "     docker tag ${APP}:latest ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${APP}:latest"
echo "     docker push ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${APP}:latest"
echo ""
echo "  4. Create ECS Fargate service (replace SUBNET_ID + SG_ID):"
echo ""
echo "     aws ecs create-service \\"
echo "       --cluster ${CLUSTER} \\"
echo "       --service-name ${APP} \\"
echo "       --task-definition ${APP} \\"
echo "       --desired-count 1 \\"
echo "       --launch-type FARGATE \\"
echo "       --network-configuration 'awsvpcConfiguration={subnets=[SUBNET_ID],securityGroups=[SG_ID],assignPublicIp=ENABLED}' \\"
echo "       --region ${REGION}"
echo "================================================================"
