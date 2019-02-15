FROM node:10-alpine

ENV WORK_DIR /usr/src/elitebot
ENV NODE_ENV production

# Create nectar directory
WORKDIR $WORK_DIR

# Install root dependencies
COPY . $WORK_DIR

RUN npm install --production --loglevel error
RUN npm run docs
RUN ls -la

EXPOSE 5000

CMD ["sh", "-c", "npm run create-config && npm run start"]
