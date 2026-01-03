FROM node:18

WORKDIR /app

COPY package.json .
RUN npm install
RUN npm install -g @google/gemini-cli

COPY . .

ENTRYPOINT ["node", "/app/src/engine.js"]
