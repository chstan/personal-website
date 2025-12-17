RUN_WEBSITE="npx serve /app/build -l 8001 -c /app/serve.json"

trap 'exit' INT TERM

until $RUN_WEBSITE; do
    echo "Restarting." >&2
    sleep 1
done