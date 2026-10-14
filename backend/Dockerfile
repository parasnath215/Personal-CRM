FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["npm", "start"]
