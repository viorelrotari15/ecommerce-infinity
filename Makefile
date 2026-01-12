.PHONY: help build dev prod up down restart logs clean setup

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Setup local environment files
	@./scripts/setup-local-env.sh

build: ## Build all services (production)
	@docker compose build

build-dev: ## Build all services (development)
	@docker compose -f docker compose.yml -f docker compose.dev.yml build

dev: ## Start in development mode (hot reload)
	@docker compose -f docker compose.yml -f docker compose.dev.yml up

prod: ## Start in production mode
	@docker compose up -d --build

up: ## Start services
	@docker compose up -d

down: ## Stop services
	@docker compose down

restart: ## Restart services
	@docker compose restart

logs: ## View logs
	@docker compose logs -f

logs-backend: ## View backend logs
	@docker compose logs -f backend

logs-frontend: ## View frontend logs
	@docker compose logs -f frontend

clean: ## Clean up containers and volumes
	@docker compose down -v
	@docker system prune -f

rebuild: ## Rebuild everything from scratch
	@docker compose down -v
	@docker compose build --no-cache
	@docker compose up -d

status: ## Show service status
	@docker compose ps

test: ## Run tests
	@cd apps/backend && npm test
	@cd apps/frontend && npm test

lint: ## Run linters
	@cd apps/backend && npm run lint
	@cd apps/frontend && npm run lint

db-migrate: ## Run database migrations
	@docker compose exec backend npx prisma migrate deploy

db-seed: ## Seed database
	@docker compose exec backend npm run prisma:seed

db-shell: ## Access database shell
	@docker compose exec postgres psql -U postgres -d ecommerce