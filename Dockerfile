FROM node:18

WORKDIR /app

RUN curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

COPY package.json .
RUN npm install

COPY . .

ENTRYPOINT ["node", "/app/src/engine.js"]
