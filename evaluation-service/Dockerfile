FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install

COPY src ./src
COPY frontend ./frontend

EXPOSE 3002
CMD ["node","src/index.js"]