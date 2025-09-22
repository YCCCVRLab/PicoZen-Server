FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache curl ca-certificates

# Create app directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies with verbose logging
RUN npm install --production --verbose

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads public/images

# Set NODE_OPTIONS for compatibility
ENV NODE_OPTIONS="--no-experimental-fetch"

# Expose port
EXPOSE 8000

# Health check with longer timeout
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start the application with debugging
CMD ["node", "--trace-warnings", "server.js"]