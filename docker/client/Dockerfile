FROM node:20-alpine AS build

WORKDIR /app/workspaces/client

COPY workspaces/client/package.json workspaces/client/package-lock.json ./
RUN npm ci

RUN ln -s /app/workspaces/client/node_modules /app/node_modules

COPY workspaces/client ./
RUN npm run build

FROM nginx:alpine
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/workspaces/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]