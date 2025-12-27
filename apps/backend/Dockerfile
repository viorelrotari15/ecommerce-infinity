FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma (required for PostgreSQL)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with retry and better network settings
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# Copy and make entrypoint script executable first
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

# Use sh to execute the script to avoid permission issues
CMD ["sh", "/app/docker-entrypoint.sh"]

