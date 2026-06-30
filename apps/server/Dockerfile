# 1. Base image
FROM golang:1.25-alpine AS builder

# 2. Files in
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# 3. Build — note the path to your main package
RUN go build -o server ./cmd/api

# --- Multi-stage: smaller final image ---
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .

# 4. Networking
EXPOSE 8080

# 5. Startup
CMD ["./server"]