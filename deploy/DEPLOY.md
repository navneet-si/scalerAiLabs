# Deployment runbook — single EC2 host

The whole stack is three containers behind nginx on port 80. Everything below runs **on the
EC2 box**, not locally.

---

## 0. Before you start — the one thing that will bite you

That box already runs something else. If anything is bound to port 80, nginx will fail to
start and `docker compose up` will exit with `address already in use`.

```bash
sudo ss -ltnp | grep ':80 '        # expect no output
docker ps --format '{{.Names}}\t{{.Ports}}'
```

If something is there, do **not** stop it blindly. Either give this stack a different host
port (change `"80:80"` to `"8080:80"` in `docker-compose.yml`) or put it behind the existing
nginx as a new `server` block. Reusing the Elastic IP is fine either way — the IP is attached
to the instance, not to a port.

---

## 1. Get the code onto the box

```bash
git clone <your-new-repo-url> fireflies && cd fireflies
```

## 2. Create the environment file

```bash
cp backend/.env.example backend/.env
nano backend/.env          # set LLM_API_KEY=<your groq key>
```

`backend/.env` is gitignored and is never baked into an image — it exists only on the host.
Without it the app still runs, but `/api/query` silently degrades to keyword answers with no
error, so the AI features will look weak rather than broken.

## 3. Bring it up

```bash
docker compose up -d --build
```

First build takes a few minutes (`npm ci` dominates). Then:

```bash
docker compose ps          # all three Up
curl -s localhost/api/health
```

## 4. Verify from outside

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://<ELASTIC_IP>/
curl -s -o /dev/null -w '%{http_code}\n' http://<ELASTIC_IP>/api/health
```

If these hang, the security group is the cause, not the app. Inbound TCP 80 must be open to
`0.0.0.0/0`.

---

## What to check if something is wrong

**Blank page, or the UI loads but no meetings appear.** The browser is calling the wrong API
host. Confirm the bundle is relative:

```bash
docker compose exec frontend sh -c 'grep -rl "localhost:8000" .next/static | wc -l'   # must be 0
```

If it is not 0, the image was built without the `NEXT_PUBLIC_API_BASE=/api` build arg.
`NEXT_PUBLIC_*` is inlined at **build** time, so fix it with a rebuild — restarting will not
help:

```bash
docker compose build --no-cache frontend && docker compose up -d
```

**AI answers look shallow / cite nothing useful.** `LLM_API_KEY` is not reaching the backend:

```bash
docker compose exec backend sh -c 'echo "${LLM_API_KEY:+key present}${LLM_API_KEY:-KEY MISSING}"'
```

**CORS errors in the browser console.** These should be impossible in this deployment — the
page and the API share one origin. Seeing one means something is calling an absolute URL, so
go back to the bundle check above.

**Everything 502.** nginx is up but the upstreams are not:

```bash
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

---

## Data

The database is the `dbdata` named volume mounted at `/srv/data` — SQLite is a file, so there
is no database container.

```bash
docker compose down       # keeps data
docker compose down -v    # DESTROYS the database
```

Back it up by copying the file out:

```bash
docker compose exec backend sh -c 'cat /srv/data/app.db' > backup-$(date +%F).db
```

## Updating

```bash
git pull && docker compose up -d --build
```

---

## Optional: HTTPS

A bare Elastic IP can only serve HTTP — certificates require a hostname. If you point a domain
at the IP, add TLS with certbot against the nginx container, or terminate TLS at an ALB or
CloudFront in front of the instance and leave this stack on port 80.
