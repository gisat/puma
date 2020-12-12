FROM node:8.16.1

WORKDIR /usr/src/app

COPY . .

RUN npm ci --production-only

EXPOSE 3030

CMD [ "node", "./server.js" ]