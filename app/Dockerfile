# Frontend Dockerfile
FROM node:18

WORKDIR /app

COPY app/package.json app/package-lock.json* ./
RUN npm install

COPY app/ .

EXPOSE 3000
CMD ["npm", "run", "dev"]
