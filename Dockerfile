FROM node:12

WORKDIR /app

RUN npm install --global bower

COPY package.json package.json
RUN npm install

COPY bower.json bower.json
RUN bower install

COPY app.js app.js
COPY bin bin
COPY data data
COPY public public
COPY routes routes
COPY views views

CMD ./bin/www

