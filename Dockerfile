FROM node

WORKDIR /app

ENV YARN_VERSION 3.1.1
RUN yarn policies set-version $YARN_VERSION

# Install from yarn.lock before copying everything else
# for cacheing reasons
COPY front/package.json front/yarn.lock ./front/
RUN cd front && yarn install --immutable
COPY package.json yarn.lock ./
RUN yarn install --immutable

COPY . ./
RUN chmod +x ./scripts/bootstrap.sh
RUN chmod +x ./scripts/run_continuously.sh
RUN yarn bootstrap
RUN cd front && yarn install --immutable && yarn build

CMD yarn run-in-container
