const express = require('express');
const amqp = require('amqplib');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// RabbitMQ connection
let channel = null;
const QUEUE_NAME = 'hello-world-queue';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function connectToRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`Connected to RabbitMQ and asserted queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    setTimeout(connectToRabbitMQ, 5000); // Retry after 5 seconds
  }
}

connectToRabbitMQ();

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World!',
    service: 'hello-world',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    rabbitmq: channel ? 'connected' : 'disconnected'
  });
});

app.post('/send-message', async (req, res) => {
  try {
    if (!channel) {
      return res.status(503).json({
        error: 'RabbitMQ not connected',
        message: 'Unable to send message, RabbitMQ connection not established'
      });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Missing message',
        message: 'Please provide a message in the request body'
      });
    }

    const messageData = {
      message,
      timestamp: new Date().toISOString(),
      service: 'hello-world'
    };

    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(messageData)),
      { persistent: true }
    );

    res.json({
      success: true,
      message: 'Message sent to queue',
      data: messageData,
      queue: QUEUE_NAME
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Hello World microservice listening on port ${PORT}`);
});
