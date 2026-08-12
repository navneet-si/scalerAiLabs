# Pinned to 3.12 deliberately: it is the newest runtime with prebuilt wheels for
# the whole dependency set, and it keeps local and deployed environments identical.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# SQLite lives here and is bind-mounted to the host so data survives rebuilds.
RUN mkdir -p /srv/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
