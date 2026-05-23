#!/usr/bin/env bash
# scripts/setup.sh
# First-time setup script for LLM Inference Platform
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   LLM Inference Platform — Setup Script   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

# Check dependencies
echo -e "\n${YELLOW}Checking dependencies...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required. Install from https://nodejs.org${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required. Install from https://docker.com${NC}"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose v2 is required.${NC}"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}Node.js 20+ required. Got: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ Docker $(docker --version | awk '{print $3}')${NC}"

# Copy env file
echo -e "\n${YELLOW}Setting up environment...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  echo -e "${YELLOW}⚠  Edit .env and add at least one LLM provider API key${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm run install:all
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Start infrastructure services
echo -e "\n${YELLOW}Starting infrastructure (PostgreSQL + Redis)...${NC}"
cd docker
docker compose up -d postgres redis
cd ..

echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
cd backend
cp ../.env .env
npx prisma migrate dev --name init
npx prisma generate
cd ..
echo -e "${GREEN}✓ Database migrated${NC}"

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Setup complete!                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "Start the full stack:"
echo -e "  ${YELLOW}npm run dev${NC}              — Dev mode (backend + frontend)"
echo -e "  ${YELLOW}npm run docker:up${NC}        — Full Docker stack"
echo ""
echo -e "Access:"
echo -e "  Frontend:   ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:4000${NC}"
echo -e "  Grafana:    ${GREEN}http://localhost:3001${NC} (admin/admin)"
echo -e "  Prometheus: ${GREEN}http://localhost:9090${NC}"
echo -e "  Prisma:     ${YELLOW}npm run db:studio${NC}"
echo ""
echo -e "${YELLOW}⚠  Remember to add your provider API key(s) in .env or Settings page${NC}"
