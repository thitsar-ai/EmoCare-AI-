# EmoCare sanctuary API — production container (Railway / Fly / any host)
FROM node:22-alpine

WORKDIR /app

# Zero npm dependencies — Node 22 native fetch proxy
COPY index.mjs ./

ENV NODE_ENV=production

# Railway and Fly inject PORT at runtime
EXPOSE 8080

USER node

CMD ["node", "index.mjs"]
