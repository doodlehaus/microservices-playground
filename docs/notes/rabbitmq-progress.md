# RabbitMQ Messaging - Progress Context

**Date**: 2025-11-28
**Status**: Option 1 (Simple Producer-Consumer) - COMPLETE ✓

---

## What We've Accomplished

### Option 1: Simple Producer-Consumer Pattern ✓

Successfully implemented a basic RabbitMQ producer-consumer pattern with two microservices:

1. **hello-world** (Producer)
   - Added `amqplib` dependency
   - Added RabbitMQ connection with auto-retry logic
   - Created `POST /send-message` endpoint
   - Updated health check to show RabbitMQ connection status
   - Added RabbitMQ credentials via Kubernetes secrets
   - File: `services/hello-world/src/index.js`

2. **message-consumer** (Consumer)
   - Created new standalone service
   - Consumes from `hello-world-queue`
   - Logs received messages with timestamps
   - Uses message acknowledgment for reliability
   - Auto-reconnects on connection failures
   - Files: `services/message-consumer/`

### Test Results

**Successfully tested end-to-end flow:**
```bash
# Sent message via hello-world
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from RabbitMQ!"}'

# Consumer received and logged:
[2025-11-28T13:01:12.386Z] Received message:
{
  "message": "Hello from RabbitMQ!",
  "timestamp": "2025-11-28T13:01:12.087Z",
  "service": "hello-world"
}
```

---

## Current Deployment State

### Services Running

```
Namespace: services

hello-world:
  - 2 replicas running on arm64 nodes (jerry, bobby)
  - Node selector: kubernetes.io/arch: arm64
  - Connected to RabbitMQ
  - Service: hello-world on port 3000

message-consumer:
  - 1 replica running
  - Actively consuming from hello-world-queue
```

### Infrastructure

```
Namespace: infrastructure

RabbitMQ:
  - Service: rabbitmq.infrastructure.svc.cluster.local:5672
  - Management UI: http://localhost:30672 (NodePort)
  - Credentials: rabbitmq-secret
  - Queue: hello-world-queue (durable)
```

---

## Known Issues & Solutions

### Multi-Architecture Cluster

**Issue**: Cluster has mixed architectures (arm64 and amd64 nodes)
- jerry: arm64
- bobby: arm64
- pigpen: amd64

**Solution Applied**: Added node selector to hello-world deployment:
```yaml
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
```

Docker images were built on arm64 Mac, so they only support arm64. To support both architectures, would need to use `docker buildx` with multi-platform builds.

---

## How to Test (Quick Reference)

### Send a Message
```bash
# Port-forward hello-world service
kubectl port-forward -n services svc/hello-world 3000:3000

# Send message (in another terminal)
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

### View Consumer Logs
```bash
# Follow logs in real-time
kubectl logs -n services -l app=message-consumer -f

# View last 50 lines
kubectl logs -n services -l app=message-consumer --tail=50
```

### Check Health
```bash
curl http://localhost:3000/health
```

### RabbitMQ Management UI
- URL: http://localhost:30672
- Credentials: From `rabbitmq-secret`

---

## Docker Images

### Current Images
```
doodlehaus/hello-world:latest
doodlehaus/message-consumer:latest
```

### Rebuild Commands
```bash
# hello-world
cd services/hello-world
npm install
docker build -t doodlehaus/hello-world:latest .
docker push doodlehaus/hello-world:latest
kubectl rollout restart deployment/hello-world -n services

# message-consumer
cd services/message-consumer
docker build -t doodlehaus/message-consumer:latest .
docker push doodlehaus/message-consumer:latest
kubectl rollout restart deployment/message-consumer -n services
```

---

## Next Steps: Option 2 - Work Queue Pattern

### Goal
Demonstrate how RabbitMQ distributes messages across multiple consumers for load balancing.

### Implementation Plan

1. **Send Multiple Messages Rapidly**
   - Update hello-world to send burst of messages
   - Or create simple script to POST multiple messages

2. **Scale Consumer Replicas**
   ```bash
   kubectl scale deployment message-consumer -n services --replicas=3
   ```

3. **Observe Load Balancing**
   - Watch logs from all consumer pods
   - See messages distributed evenly
   - Understand prefetch and fair dispatch

4. **Add Processing Simulation**
   - Add artificial delay in consumer
   - Show how work gets distributed while some consumers are busy

5. **Message Acknowledgment**
   - Demonstrate what happens if consumer crashes
   - Show message redelivery

### Key Concepts to Demonstrate
- Fair dispatch with prefetch
- Message acknowledgment and reliability
- Horizontal scaling of consumers
- Work distribution patterns

---

## Next Steps: Option 3 - Pub/Sub Pattern

### Goal
Use RabbitMQ exchanges to broadcast messages to multiple consumers (fanout) and route messages based on patterns (topic).

### Implementation Plan

1. **Fanout Exchange**
   - Create exchange in hello-world
   - Multiple consumers with different queues
   - Same message delivered to all

2. **Topic Exchange**
   - Implement routing keys (e.g., "logs.error", "logs.info")
   - Consumers subscribe to patterns (e.g., "logs.*", "*.error")
   - Selective message routing

3. **Create New Services**
   - logger-service (subscribes to all logs)
   - error-handler-service (subscribes to errors only)
   - audit-service (subscribes to everything)

### Key Concepts to Demonstrate
- Exchange types (fanout, topic, direct)
- Routing keys and binding patterns
- Multiple consumers, same message
- Selective message routing

---

## Documentation

Full documentation available in:
- `docs/notes/simple-messaging-service.md` - Detailed implementation guide

---

## Quick Recovery Commands

### If services are down:
```bash
# Check pod status
kubectl get pods -n services

# Restart deployments
kubectl rollout restart deployment/hello-world -n services
kubectl rollout restart deployment/message-consumer -n services

# Check RabbitMQ
kubectl get pods -n infrastructure -l app=rabbitmq
```

### If RabbitMQ secret is missing in services namespace:
```bash
kubectl get secret rabbitmq-secret -n infrastructure -o yaml | \
  sed 's/namespace: infrastructure/namespace: services/' | \
  kubectl apply -f -
```

### View all RabbitMQ resources:
```bash
kubectl get all -n infrastructure -l app=rabbitmq
```

---

## Environment Details

**Working Directory**: `/Users/markanderson/Projects/microservices-playground`

**Git Status**:
- Branch: main
- Modified: `.gitignore`, `services/hello-world/`, new `services/message-consumer/`
- New docs: `docs/notes/`

**Cluster**: K3s multi-node (jerry, bobby, pigpen)

**Registry**: doodlehaus on Docker Hub

---

## Session Notes

- Successfully completed Option 1 implementation
- All services deployed and tested
- Producer-consumer flow verified working
- Ready to proceed with Option 2 (Work Queue) or Option 3 (Pub/Sub)
- Documentation up to date
