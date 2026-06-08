FROM python:3.12-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --timeout=120 --retries=5 -r requirements.txt && \
    python3 -m playwright install chromium --with-deps

COPY . .

RUN mkdir -p analyses

EXPOSE 5000
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "5000"]
