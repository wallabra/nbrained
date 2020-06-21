#!/bin/sh
echo '-- Compiling TypeScript...'
tsc || exit 1

echo '-- Generating documentation...'
typedoc --out ../../../docs/impl/typescript/api || exit 1

echo '-- Done!'
