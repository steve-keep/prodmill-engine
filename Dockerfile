FROM node:18

WORKDIR /app

COPY package.json .
RUN apt-get update && apt-get install -y git
RUN npm install
RUN npm install -g @google/gemini-cli

COPY . .

ENTRYPOINT ["node", "/app/src/engine.js"]
