supabase secrets set \
  INGEST_API_KEY="816b18b6e7f183edaaa4c28253d26f4bb38223643877e84a08bfd86ad21c9271" \
  PROJECT_URL="https://vvauifprlwulaetdiqow.supabase.co" \
　SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2YXVpZnBybHd1bGFldGRpcW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAwMzkyMCwiZXhwIjoyMDcwNTc5OTIwfQ.nAIwzpY-7Td0d7VU35MHewVNlRZOuccUuUH1JfkItMI"


curl -X POST "https://vvauifprlwulaetdiqow.supabase.co/functions/v1/ingest" \
  -H "Content-Type: application/json" \
  -H "x-api-key: 816b18b6e7f183edaaa4c28253d26f4bb38223643877e84a08bfd86ad21c9271"" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "owner_id": "f1004e95-0d96-4b18-aafc-30a75a871e1f",
    "account_login": 12345678,
    "reason": "smoke"
  }'
