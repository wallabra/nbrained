#!/bin/sh

: || { # checks are not user-desirable
    echo '++ Verifying build works...'

    ./scripts/build.sh 2>&1 | awk '{ print "[VERIFY.BUILD]", $0 }' || exit 1

    echo '++ Verifying doc building works...'

    (
        cd ../../.. &&
        mkdocs build
    ) 2>&1 | awk '{ print "[BUILD.MKDOCS]", $0 }' || exit 1
}

echo '++ Everything works! Watching changes for building.'

( cd ../../../ && mkdocs serve -a ':::8767' ) 2>&1 | awk '{ print "[SERVE.MKDOCS]", $0 }' &
npx watch "npx tsc ./scripts/build.sh && npx typedoc --out ../../../docs/impl/typescript/api" src --wait 6 -u 2>&1 | awk '{ print "[BUILD]", $0 }' &
