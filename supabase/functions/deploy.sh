#!/bin/bash
# 部署所有 Edge Functions 到 Supabase
# 使用前請先執行：supabase login

set -e

PROJECT_REF="your-project-ref"   # 從 Supabase Dashboard > Settings > General 取得

echo "🚀 Deploying Edge Functions..."

supabase functions deploy line-auth         --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy onboarding        --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy take-ticket       --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy checkin           --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy call-next         --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy export-csv        --project-ref $PROJECT_REF --no-verify-jwt

echo ""
echo "✅ All functions deployed!"
echo ""
echo "⚠️  Remember to set secrets:"
echo "supabase secrets set LINE_AUTH_SECRET=your-secret --project-ref $PROJECT_REF"
