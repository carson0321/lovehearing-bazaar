ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
