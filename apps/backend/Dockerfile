FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma (required for PostgreSQL), bash, and dos2unix for line ending conversion
RUN apt-get update && apt-get install -y openssl bash dos2unix && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy and make entrypoint script executable first
# Convert line endings to LF (handles Windows CRLF) and make executable
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN dos2unix /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy source code
COPY . .

# Convert line endings again (in case COPY . . overwrote the script with CRLF)
RUN dos2unix /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

# Use bash to execute the script (more reliable than sh)
# Convert line endings at startup (volume mounts may overwrite with CRLF)
CMD ["bash", "-c", "dos2unix /app/docker-entrypoint.sh 2>/dev/null || true; bash /app/docker-entrypoint.sh"]

