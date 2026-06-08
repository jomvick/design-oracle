FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libwayland-client0 libwayland-egl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --timeout=120 --retries=5 -r requirements.txt && \
    python -m playwright install chromium

COPY . .

RUN mkdir -p analyses

EXPOSE 5000
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "5000"]
