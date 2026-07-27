# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Playwright Node.js backend runner
FROM mcr.microsoft.com/playwright:v1.60.0-noble AS runner
WORKDIR /app

# Install docker CLI, git, and unzip
RUN apt-get update && apt-get install -y \
    docker.io \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Download and install CodeQL bundle (version v2.17.5)
RUN curl -OL https://github.com/github/codeql-action/releases/download/codeql-bundle-v2.17.5/codeql-bundle-linux64.tar.gz \
    && tar -xzf codeql-bundle-linux64.tar.gz -C /usr/local \
    && rm codeql-bundle-linux64.tar.gz

# Expose CodeQL in PATH
ENV PATH="/usr/local/codeql:${PATH}"

# Copy backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Copy compiled React frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose backend port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
