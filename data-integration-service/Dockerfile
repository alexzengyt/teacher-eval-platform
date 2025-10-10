FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY src ./src

# The service will listen on 7002 by default
ENV PORT=7002
EXPOSE 7002

CMD ["npm", "start"]
