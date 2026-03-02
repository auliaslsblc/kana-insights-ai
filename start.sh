#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Kana Insights AI...${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}📖 Please read SETUP_API_KEY.md for instructions${NC}"
    exit 1
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "GEMINI_API_KEY=.*[^YOUR_API_KEY_HERE]" .env; then
    echo -e "${YELLOW}⚠️  Warning: GEMINI_API_KEY may not be configured${NC}"
    echo -e "${YELLOW}📖 Please add your Gemini API key to .env file${NC}"
    echo -e "${YELLOW}   Get it from: https://makersuite.google.com/app/apikey${NC}"
    echo ""
fi

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx server.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# Start backend
echo -e "${GREEN}🔧 Starting backend server on port 3000...${NC}"
npm run server &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}🎨 Starting frontend dev server on port 5173...${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Both servers started!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
