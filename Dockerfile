FROM oven/bun:latest

WORKDIR /app

# Copy source code
COPY . .
RUN bun install --frozen-lockfile

# Build the application
RUN bun run build

EXPOSE 3000

CMD ["bun", "alerts/index.ts"]
