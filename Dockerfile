FROM node:24-bookworm

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run db:generate && npm run db:init && npm run db:push && npm run db:seed && npm run dev"]
