#!/bin/bash

# This script is used by the Docker container to restart the server if it crashes.
# It relies on the "serve" script defined in package.json.

RUN_WEBSITE="pnpm serve"

trap 'exit' INT TERM

until $RUN_WEBSITE; do
    echo "Restarting." >&2
    sleep 1
done
