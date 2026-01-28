FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma (required for PostgreSQL), procps for ps command (required by NestJS watch mode), and dos2unix for line ending conversion
RUN apt-get update && apt-get install -y openssl procps dos2unix && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with retry and better network settings
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# Copy and make entrypoint script executable first, converting line endings
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN dos2unix /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

# Use sh to execute the script to avoid permission issues
CMD ["sh", "/app/docker-entrypoint.sh"]

