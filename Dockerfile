# Dockerfile for Elysia Backend
# Multi-stage build for optimized production image


FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .


FROM oven/bun:1-alpine AS production

WORKDIR /app

# Create non-root user for security (Alpine uses addgroup/adduser)
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 -G appgroup appuser

# Copy dependencies and source from builder
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/src ./src
COPY --from=builder --chown=appuser:appgroup /app/tsconfig.json ./
COPY --from=builder --chown=appuser:appgroup /app/drizzle.config.ts ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun --eval "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "start"]
