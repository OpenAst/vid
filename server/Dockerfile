# Use official Node 22 image
FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

RUN if [ "$NODE_ENV" = "production" ]; then \
      npm ci --omit=dev --prefer-offline --no-audit; \
    else \
      npm ci --prefer-offline --no-audit; \
    fi

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
