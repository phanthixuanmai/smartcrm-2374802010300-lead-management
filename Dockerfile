FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev && npm cache clean --force

COPY src ./src
COPY db ./db
COPY data/imports ./data/imports

USER node
EXPOSE 3000
CMD ["npm", "start"]
