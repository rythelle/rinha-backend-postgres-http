FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm i --silent

COPY . ./app

CMD ["npm", "run", "start"]