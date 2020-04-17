# Dockerfile for node-red-contrib-orion
#
# Source:: https://github.com/orion-labs/node-red-contrib-orion
# Author:: Greg Albrecht <gba@orionlabs.io>
# Copyright:: Copyright 2020 Orion Labs, Inc.
# License:: Apache License, Version 2.0
#

FROM node:10-buster

EXPOSE 1880

COPY . /node-red-contrib-orion

RUN npm install --unsafe-perm -g node-red
RUN npm install --unsafe-perm -g /node-red-contrib-orion

CMD node-red


