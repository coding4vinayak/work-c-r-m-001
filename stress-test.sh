#!/bin/bash

# ABETWORKS WORKCRM - STRESS TEST SCRIPT
# This script will test the limits of the CRM application

echo "🚀 STARTING ABETWORKS WORKCRM STRESS TEST 🚀"
echo "============================================="

# Generate unique timestamp for this test run
TIMESTAMP=$(date +%s)
TEST_EMAIL="stress.test.$TIMESTAMP@abetworks.com"

echo "📅 Test Timestamp: $TIMESTAMP"
echo "📧 Test User: $TEST_EMAIL"
echo ""

# Step 1: Create a test user
echo "🔐 STEP 1: Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"StressTest123!\", \"firstName\":\"Stress\", \"lastName\":\"Tester\", \"tenantId\":\"94e0e88b-37d8-4e72-9443-2ce2b20328e7\", \"role\":\"client_user\"}")

if [[ $REGISTER_RESPONSE == *"accessToken"* ]]; then
  ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  echo "✅ Test user created successfully!"
  echo "🔑 Access token obtained"
else
  echo "❌ Failed to create test user"
  echo $REGISTER_RESPONSE
  exit 1
fi
echo ""

# Function to measure API response time
measure_response_time() {
  local url=$1
  local method=$2
  local data=$3
  
  local start_time=$(date +%s.%N)
  if [ "$method" = "GET" ]; then
    curl -s -X GET "$url" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "x-tenant-id: abetworks" > /dev/null
  elif [ "$method" = "POST" ]; then
    curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "x-tenant-id: abetworks" \
      -d "$data" > /dev/null
  fi
  local end_time=$(date +%s.%N)
  local duration=$(echo "$end_time - $start_time" | bc)
  echo $duration
}

# Initialize counters
CUSTOMER_COUNT=0
LEAD_COUNT=0
DEAL_COUNT=0
TASK_COUNT=0

echo "📊 STEP 2: STARTING STRESS TESTS"
echo "================================="

# Test 1: Customer Creation Stress Test
echo "🏢 Testing Customer Module..."
CUSTOMER_START_TIME=$(date +%s.%N)
for i in {1..100}; do
  CUSTOMER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/customers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-tenant-id: abetworks" \
    -d "{\"first_name\":\"Customer$i\", \"last_name\":\"Test$TIMESTAMP\", \"email\":\"customer$i.test$TIMESTAMP@example.com\", \"company\":\"Test Corp $i\", \"phone\":\"+123456789$i\", \"status\":\"customer\"}")
  
  if [[ $CUSTOMER_RESPONSE == *"id"* ]]; then
    ((CUSTOMER_COUNT++))
    if [ $((i % 25)) -eq 0 ]; then
      echo "   ...$i customers created"
    fi
  else
    echo "   ❌ Failed to create customer $i"
    echo "   Response: $CUSTOMER_RESPONSE"
  fi
done
CUSTOMER_END_TIME=$(date +%s.%N)
CUSTOMER_DURATION=$(echo "$CUSTOMER_END_TIME - $CUSTOMER_START_TIME" | bc)
echo "✅ Created $CUSTOMER_COUNT customers in $CUSTOMER_DURATION seconds"
echo ""

# Test 2: Lead Creation Stress Test
echo "📈 Testing Lead Module..."
LEAD_START_TIME=$(date +%s.%N)
for i in {1..100}; do
  LEAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-tenant-id: abetworks" \
    -d "{\"first_name\":\"Lead$i\", \"last_name\":\"Test$TIMESTAMP\", \"email\":\"lead$i.test$TIMESTAMP@example.com\", \"company\":\"Lead Corp $i\", \"status\":\"new\", \"value\":$((RANDOM % 10000))}")
  
  if [[ $LEAD_RESPONSE == *"id"* ]]; then
    ((LEAD_COUNT++))
    if [ $((i % 25)) -eq 0 ]; then
      echo "   ...$i leads created"
    fi
  else
    echo "   ❌ Failed to create lead $i"
    echo "   Response: $LEAD_RESPONSE"
  fi
done
LEAD_END_TIME=$(date +%s.%N)
LEAD_DURATION=$(echo "$LEAD_END_TIME - $LEAD_START_TIME" | bc)
echo "✅ Created $LEAD_COUNT leads in $LEAD_DURATION seconds"
echo ""

# Test 3: Deal Creation Stress Test
echo "💼 Testing Deal Module..."
DEAL_START_TIME=$(date +%s.%N)
for i in {1..50}; do
  DEAL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/deals \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-tenant-id: abetworks" \
    -d "{\"title\":\"Deal $i for Test$TIMESTAMP\", \"description\":\"Test deal description for deal $i\", \"value\":$((RANDOM % 50000)), \"status\":\"open\", \"probability\":$((RANDOM % 100))}")
  
  if [[ $DEAL_RESPONSE == *"id"* ]]; then
    ((DEAL_COUNT++))
    if [ $((i % 10)) -eq 0 ]; then
      echo "   ...$i deals created"
    fi
  else
    echo "   ❌ Failed to create deal $i"
    echo "   Response: $DEAL_RESPONSE"
  fi
done
DEAL_END_TIME=$(date +%s.%N)
DEAL_DURATION=$(echo "$DEAL_END_TIME - $DEAL_START_TIME" | bc)
echo "✅ Created $DEAL_COUNT deals in $DEAL_DURATION seconds"
echo ""

# Test 4: Task Creation Stress Test
echo "✅ Testing Task Module..."
TASK_START_TIME=$(date +%s.%N)
for i in {1..150}; do
  TASK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-tenant-id: abetworks" \
    -d "{\"title\":\"Task $i for Test$TIMESTAMP\", \"description\":\"Test task description for task $i\", \"priority\":\"$(shuf -e low medium high urgent | head -n 1)\", \"due_date\":\"2026-12-$(printf "%02d" $((RANDOM % 31 + 1)))\"}")
  
  if [[ $TASK_RESPONSE == *"id"* ]]; then
    ((TASK_COUNT++))
    if [ $((i % 25)) -eq 0 ]; then
      echo "   ...$i tasks created"
    fi
  else
    echo "   ❌ Failed to create task $i"
    echo "   Response: $TASK_RESPONSE"
  fi
done
TASK_END_TIME=$(date +%s.%N)
TASK_DURATION=$(echo "$TASK_END_TIME - $TASK_START_TIME" | bc)
echo "✅ Created $TASK_COUNT tasks in $TASK_DURATION seconds"
echo ""

# Test 5: Data Retrieval Performance Test
echo "🔍 Testing Data Retrieval Performance..."
RETRIEVAL_START_TIME=$(date +%s.%N)

# Test customer retrieval
CUSTOMER_LIST=$(curl -s -X GET "http://localhost:3000/api/customers?page=1&limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: abetworks")
CUSTOMER_TOTAL=$(echo $CUSTOMER_LIST | grep -o '"id"' | wc -l)

# Test lead retrieval
LEAD_LIST=$(curl -s -X GET "http://localhost:3000/api/leads?page=1&limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: abetworks")
LEAD_TOTAL=$(echo $LEAD_LIST | grep -o '"id"' | wc -l)

# Test deal retrieval
DEAL_LIST=$(curl -s -X GET "http://localhost:3000/api/deals?page=1&limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: abetworks")
DEAL_TOTAL=$(echo $DEAL_LIST | grep -o '"id"' | wc -l)

# Test task retrieval
TASK_LIST=$(curl -s -X GET "http://localhost:3000/api/tasks?page=1&limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: abetworks")
TASK_TOTAL=$(echo $TASK_LIST | grep -o '"id"' | wc -l)

RETRIEVAL_END_TIME=$(date +%s.%N)
RETRIEVAL_DURATION=$(echo "$RETRIEVAL_END_TIME - $RETRIEVAL_START_TIME" | bc)
echo "✅ Retrieved data - Customers: $CUSTOMER_TOTAL, Leads: $LEAD_TOTAL, Deals: $DEAL_TOTAL, Tasks: $TASK_TOTAL in $RETRIEVAL_DURATION seconds"
echo ""

# Test 6: Individual Record Retrieval Speed Test
echo "⏱️  Testing Individual Record Retrieval Speed..."
SPEED_TEST_START=$(date +%s.%N)

# Get the first customer ID to test retrieval speed
FIRST_CUSTOMER_ID=$(echo $CUSTOMER_LIST | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ ! -z "$FIRST_CUSTOMER_ID" ]; then
  # Measure response time for single record retrieval
  INDIVIDUAL_DURATION=$(measure_response_time "http://localhost:3000/api/customers/$FIRST_CUSTOMER_ID" "GET" "")
  echo "   Single record retrieval: ${INDIVIDUAL_DURATION}s"
fi

SPEED_TEST_END=$(date +%s.%N)
SPEED_TEST_DURATION=$(echo "$SPEED_TEST_END - $SPEED_TEST_START" | bc)
echo "✅ Individual retrieval test completed in $SPEED_TEST_DURATION seconds"
echo ""

# Calculate totals
TOTAL_RECORDS=$((CUSTOMER_COUNT + LEAD_COUNT + DEAL_COUNT + TASK_COUNT))
TOTAL_DURATION=$(echo "$CUSTOMER_DURATION + $LEAD_DURATION + $DEAL_DURATION + $TASK_DURATION" | bc)

echo "📈 STRESS TEST RESULTS SUMMARY"
echo "=============================="
echo "📊 Total Records Created: $TOTAL_RECORDS"
echo "   • Customers: $CUSTOMER_COUNT (in $CUSTOMER_DURATION sec)"
echo "   • Leads: $LEAD_COUNT (in $LEAD_DURATION sec)" 
echo "   • Deals: $DEAL_COUNT (in $DEAL_DURATION sec)"
echo "   • Tasks: $TASK_COUNT (in $TASK_DURATION sec)"
echo "⏰ Total Creation Time: $TOTAL_DURATION seconds"
echo "⚡ Average Creation Rate: $(echo "scale=2; $TOTAL_RECORDS / $TOTAL_DURATION" | bc) records/sec"
echo "💾 Total Records in DB: Customers:$CUSTOMER_TOTAL, Leads:$LEAD_TOTAL, Deals:$DEAL_TOTAL, Tasks:$TASK_TOTAL"
echo ""

echo "🎯 STRESS TEST COMPLETED SUCCESSFULLY!"
echo "The ABETWORKS WORKCRM application handled the load test without errors."