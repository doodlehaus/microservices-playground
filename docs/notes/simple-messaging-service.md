# Simple Messaging Service - Producer-Consumer Pattern

## Overview

Implementation of a basic RabbitMQ producer-consumer pattern using two microservices:
- **hello-world**: Producer service that sends messages to a RabbitMQ queue
- **message-consumer**: Consumer service that receives and processes messages from the queue

## Architecture

```
HTTP Request → hello-world (Producer) → RabbitMQ Queue → message-consumer (Consumer) → Logs
```

## What's Been Implemented

### 1. hello-world Service (Producer)

**Changes:**
- Added `amqplib` dependency (services/hello-world/package.json:15)
- Added RabbitMQ connection with auto-retry (services/hello-world/src/index.js:13-23)
- Created `POST /send-message` endpoint (services/hello-world/src/index.js:43-86)
- Updated health check to show RabbitMQ status (services/hello-world/src/index.js:39)
- Added RabbitMQ credentials to deployment (services/hello-world/k8s/deployment.yaml:29-40)

**Features:**
- Connects to RabbitMQ on startup
- Creates/asserts `hello-world-queue` as a durable queue
- Sends messages with metadata (timestamp, service name)
- Messages are marked persistent for durability
- Auto-reconnects if connection fails

### 2. message-consumer Service (Consumer)

**New Service Created:**
- Standalone consumer service that processes messages from `hello-world-queue`
- Logs received messages with timestamps and formatted JSON
- Uses message acknowledgment to ensure reliable delivery
- Prefetch set to 1 for fair distribution across multiple consumers
- Auto-reconnects on connection failures

**Files:**
- `services/message-consumer/src/index.js` - Consumer logic
- `services/message-consumer/package.json` - Dependencies
- `services/message-consumer/Dockerfile` - Container image
- `services/message-consumer/k8s/` - Kubernetes manifests

## How to Deploy

### 1. Build and Push Docker Images

```bash
# Build and push hello-world
cd services/hello-world
docker build -t doodlehaus/hello-world:latest .
docker push doodlehaus/hello-world:latest

# Build and push message-consumer
cd ../message-consumer
docker build -t doodlehaus/message-consumer:latest .
docker push doodlehaus/message-consumer:latest
```

### 2. Deploy to Kubernetes

```bash
# Copy RabbitMQ secret to services namespace
kubectl get secret rabbitmq-secret -n infrastructure -o yaml | \
  sed 's/namespace: infrastructure/namespace: services/' | \
  kubectl apply -f -

# Deploy/update hello-world
kubectl apply -f services/hello-world/k8s/

# Deploy message-consumer
kubectl apply -f services/message-consumer/k8s/
```

## Testing the Flow

### 1. Send a Message

```bash
# Port-forward to hello-world service
kubectl port-forward -n services svc/hello-world 3000:3000

# In another terminal, send a message
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from RabbitMQ!"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Message sent to queue",
  "data": {
    "message": "Hello from RabbitMQ!",
    "timestamp": "2025-11-28T...",
    "service": "hello-world"
  },
  "queue": "hello-world-queue"
}
```

### 2. View Consumer Logs

```bash
# Watch the consumer process messages
kubectl logs -n services -l app=message-consumer -f
```

**Expected Output:**
```
[2025-11-28T...] Received message:
{
  "message": "Hello from RabbitMQ!",
  "timestamp": "2025-11-28T...",
  "service": "hello-world"
}
---
```

### 3. Check Health Status

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "rabbitmq": "connected"
}
```

## RabbitMQ Management UI

Access the management interface to view queues, messages, and connections:

```bash
# Already exposed via NodePort
# Access at: http://localhost:30672
# Credentials: admin / (from rabbitmq-secret)
```

## Key Concepts Demonstrated

1. **Producer Pattern**: hello-world service produces messages on demand via HTTP endpoint
2. **Consumer Pattern**: message-consumer continuously listens for messages
3. **Durable Queues**: Messages survive RabbitMQ restarts
4. **Persistent Messages**: Messages are written to disk
5. **Message Acknowledgment**: Consumer confirms message processing
6. **Fair Distribution**: Prefetch=1 ensures even load across consumers
7. **Auto-Reconnect**: Both services handle connection failures gracefully

## Next Steps

### Option 2: Work Queue Pattern
- Send multiple messages rapidly
- Scale message-consumer replicas to see load balancing
- Understand message distribution and acknowledgment

### Option 3: Pub/Sub Pattern
- Introduce exchanges (fanout/topic)
- Multiple consumers receive the same message
- Implement routing keys and patterns

## Configuration

**Queue Name**: `hello-world-queue`

**RabbitMQ Connection**:
- Service: `rabbitmq.infrastructure.svc.cluster.local:5672`
- Credentials: From `rabbitmq-secret` in infrastructure namespace

**Environment Variables**:
- `RABBITMQ_URL`: Full connection string with credentials
- `RABBITMQ_USER`: Username from secret
- `RABBITMQ_PASS`: Password from secret
