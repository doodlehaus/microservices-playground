const amqp = require('amqplib');

const QUEUE_NAME = 'hello-world-queue';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function startConsumer() {
  try {
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`✓ Connected to RabbitMQ`);
    console.log(`✓ Waiting for messages in queue: ${QUEUE_NAME}`);
    console.log('---');

    // Set prefetch to 1 to ensure fair distribution of messages
    channel.prefetch(1);

    channel.consume(
      QUEUE_NAME,
      (msg) => {
        if (msg !== null) {
          const content = msg.content.toString();
          console.log(`[${new Date().toISOString()}] Received message:`);

          try {
            const data = JSON.parse(content);
            console.log(JSON.stringify(data, null, 2));
          } catch (error) {
            console.log(content);
          }

          console.log('---');

          // Acknowledge the message
          channel.ack(msg);
        }
      },
      { noAck: false }
    );

    // Handle connection errors
    connection.on('error', (error) => {
      console.error('RabbitMQ connection error:', error.message);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed. Reconnecting in 5 seconds...');
      setTimeout(startConsumer, 5000);
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startConsumer, 5000);
  }
}

console.log('Message Consumer Service Starting...');
console.log(`Queue: ${QUEUE_NAME}`);
console.log(`RabbitMQ URL: ${RABBITMQ_URL.replace(/\/\/.*@/, '//***:***@')}`);
console.log('');

startConsumer();
