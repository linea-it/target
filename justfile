# Justfile para gerenciar os ambientes Target e Canvas


# Lista todos os comandos disponíveis
default:
    @just --list

# ========================================
# Target Viewer
# ========================================

# Inicia o ambiente Target
target-up:
    export COMPOSE_FILE=docker-compose.target.yml
    docker compose up -d


# ========================================
# Canvas
# ========================================

# Inicia o ambiente Canvas
canvas-up:
    export COMPOSE_FILE=docker-compose.canvas.yml
    docker compose up -d