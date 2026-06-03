# EmoCare sanctuary API — production container (Railway / Fly)
#
# Build from repo root (dockerContext = ".") so COPY paths are unambiguous.
FROM node:22-alpine

WORKDIR /app

COPY server/index.mjs ./index.mjs

ENV NODE_ENV=production

EXPOSE 8080

USER node

CMD ["node", "index.mjs"]
