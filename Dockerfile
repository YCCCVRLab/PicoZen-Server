FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/images uploads/files uploads/temp public/images

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S picozen -u 1001

# Change ownership of app directory
RUN chown -R picozen:nodejs /app

# Switch to non-root user
USER picozen

# Expose port (Koyeb uses PORT environment variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start the application
CMD ["node", "server.js"]