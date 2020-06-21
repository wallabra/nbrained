#!/bin/sh
echo '-- Compiling TypeScript...'
tsc --pretty 2>&1 | awk '{ print "[TSC]", $0 }' || exit 1

echo '-- Generating documentation...'
typedoc --out ../../../docs/impl/typescript/api 2>&1 | awk '{ print "[TYPEDOC]", $0 }' || exit 1

echo '-- Done!'
