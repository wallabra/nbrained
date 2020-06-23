#!/bin/sh
tsc --pretty && node ./tests/"$1".js
