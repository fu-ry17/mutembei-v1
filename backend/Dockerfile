FROM python:3.14-slim AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && pip install --no-cache-dir uv \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv venv .venv && uv sync --frozen --no-dev

FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/.venv ./.venv
COPY src ./src
EXPOSE 7001
CMD [".venv/bin/uvicorn", "src:app", "--host", "0.0.0.0", "--port", "7001"]