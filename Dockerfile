FROM node:14.1-alpine

WORKDIR /app

# Install from yarn.lock before copying everything else
# for cacheing reasons
COPY front/package.json front/yarn.lock ./front/
RUN cd front && yarn install --pure-lockfile
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile

COPY . ./
RUN chmod +x ./scripts/bootstrap.sh
RUN chmod +x ./scripts/run_continuously.sh
RUN yarn bootstrap
RUN cd front && yarn build

CMD yarn run-in-container
