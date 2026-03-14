<!--start inngest dev-->
INNGEST_DEV=1 uvicorn src:app --reload --port 7001

<!--start server-->
npx --ignore-scripts=false inngest-cli@latest dev -u http://127.0.0.1:7001/api/inngest --no-discovery
