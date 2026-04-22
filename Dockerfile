FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate

ENV NODE_ENV=production
ENV API_PORT=4102

EXPOSE 4102

CMD ["npm", "run", "api:production"]
