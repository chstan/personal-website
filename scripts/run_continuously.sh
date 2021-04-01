#!/bin/bash

yarn global add serve
RUN_WEBSITE="serve /app/front/build -l 8001"

until $RUN_WEBSITE; do
    echo "Restarting." >&2
    sleep 1
done