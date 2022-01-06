npm install --global serve
RUN_WEBSITE="serve /app/front/build -l 8001 -c /app/serve.json"

trap 'exit' INT TERM

until $RUN_WEBSITE; do
    echo "Restarting." >&2
    sleep 1
done