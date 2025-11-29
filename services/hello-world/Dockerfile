FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY src ./src

RUN chown -R node:node /app

EXPOSE 3000

USER node

CMD ["npm", "start"]
