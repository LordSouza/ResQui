FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Cliente psql — útil para inspecionar o Postgres do serviço `postgres`
# do docker-compose sem precisar instalar nada manualmente depois.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
