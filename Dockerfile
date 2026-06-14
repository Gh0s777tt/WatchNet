FROM node:22-alpine
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && mkdir -p /app/data/workspaces /app/data/uploads /app/data/users && chown -R nextjs:nodejs /app/data && apk add --no-cache poppler-utils
COPY .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY public ./public
# Declarative ontology (read at runtime by /api/ontology/types) — not traced
# into the standalone bundle, so copy it explicitly or the data-entry UI falls
# back to hardcoded types.
COPY --chown=nextjs:nodejs osiris-foundation/ontology ./osiris-foundation/ontology
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
CMD ["node", "server.js"]
