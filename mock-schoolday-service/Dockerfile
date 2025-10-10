# Simple Node runtime
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY src ./src

# The service will listen on 7001 by default
ENV PORT=7001
EXPOSE 7001

CMD ["npm", "start"]
