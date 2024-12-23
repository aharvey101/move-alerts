FROM oven/bun:latest

WORKDIR /app

# Copy source code
COPY . .
RUN bun install --frozen-lockfile

# Build the application

EXPOSE 3000

CMD ["bun", "index.ts"]
