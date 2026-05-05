# Comando para iniciar PostgreSQL + Redis com Docker
# Execute estes comandos no terminal:

# 1. PostgreSQL
docker run --name barberflow-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=barberflow -p 5432:5432 -d postgres:15

# 2. Redis
docker run --name barberflow-redis -p 6379:6379 -d redis:7

# 3. Verificar se estão rodando
docker ps

# Para parar:
# docker stop barberflow-postgres barberflow-redis

# Para remover:
# docker rm barberflow-postgres barberflow-redis