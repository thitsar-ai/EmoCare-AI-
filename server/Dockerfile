# EmoCare sanctuary API — production container (Railway / Fly / any host)
#
# Build context: server/ (see railway.toml dockerContext)
# Only index.mjs is copied — zero npm dependencies.
FROM node:22-alpine

WORKDIR /app

COPY ./index.mjs ./index.mjs

ENV NODE_ENV=production

# Railway and Fly inject PORT at runtime
EXPOSE 8080

USER node

CMD ["node", "index.mjs"]
