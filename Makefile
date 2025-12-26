.PHONY: help dev build down clean logs

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start all services in development mode
	docker compose up

build: ## Build all Docker containers
	docker compose build

down: ## Stop all services
	docker compose down

clean: ## Stop services and remove volumes (clean database)
	docker compose down -v

logs: ## View logs from all services
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

logs-db: ## View database logs
	docker compose logs -f postgres

restart: ## Restart all services
	docker compose restart

rebuild: ## Rebuild and restart all services
	docker compose up --build -d

