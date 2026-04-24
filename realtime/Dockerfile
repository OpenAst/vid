FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "node dist/index.js"]
