# Makefile for node-red-contrib-orion
#
# Source:: https://github.com/orion-labs/node-red-contrib-orion
# Author:: Greg Albrecht <gba@orionlabs.io>
# Copyright:: Copyright 2020 Orion Labs, Inc.
# License:: Apache License, Version 2.0
#

.DEFAULT_GOAL := all


all: install

install:
	npm install -g .

publish:
	npm publish

lint: jshint eslint jslint

jshint:
	jshint *.js

eslint:
	eslint *.js

jslint:
	jslint *.js

docker_build:
	docker build -t testing:node-red-contrib-orion .

docker_run:
	docker run -p 1880:1880 -it --rm --name node-red-contrib-orion testing:node-red-contrib-orion
