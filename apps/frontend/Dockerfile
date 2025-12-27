FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry and better network settings
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

