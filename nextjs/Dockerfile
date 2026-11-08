FROM node:24-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
