FROM node:24-bookworm-slim

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node demo ./demo

RUN mkdir -p /app/data && chown node:node /app/data

ENV HOST=0.0.0.0 \
    PORT=3000 \
    DB_PATH=/app/data/data.sqlite

VOLUME ["/app/data"]
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "src/server.mjs"]
