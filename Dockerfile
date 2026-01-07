# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy the Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o prodmill-engine .

# Stage 2: Create the final image
FROM alpine:latest

WORKDIR /app

# Install git, which is required by the update-spec-list mode
RUN apk --no-cache add git

# Copy the compiled binary from the builder stage
COPY --from=builder /app/prodmill-engine .

# Set the entrypoint for the container
ENTRYPOINT ["/app/prodmill-engine"]
