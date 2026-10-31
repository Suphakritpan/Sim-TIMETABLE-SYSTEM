# The API and the worker use this one image. Pango is what WeasyPrint needs to lay out Thai in the PDF.
FROM python:3.12.8-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv==0.13.6

WORKDIR /app
COPY pyproject.toml uv.lock .python-version alembic.ini README.md ./
COPY src src
COPY migrations migrations
RUN uv sync --frozen --no-dev

RUN useradd --create-home app && chown -R app /app
USER app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
