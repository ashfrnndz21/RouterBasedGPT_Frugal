# Simple Password Protection with Nginx

Super simple setup - just username/password protection for your FrugalAI app.

## Quick Setup (3 steps)

### 1. Create Password

```bash
./dockers/create-auth.sh
```

Enter a username and password when prompted.

### 2. Start Everything

```bash
docker compose -f docker-compose.nginx.yaml up -d
```

### 3. Open Browser

Go to `http://localhost` - enter your username/password!

That's it! 🎉

---

## How It Works

```
Browser → nginx (checks password) → your app
```

- All pages require username/password
- Health check at `/api/health` works without password (for monitoring)
- Port 3000 not exposed - only accessible through nginx

---

## Add More Users

```bash
# Add another user
htpasswd dockers/nginx/.htpasswd username2
```

## Remove User

```bash
htpasswd -D dockers/nginx/.htpasswd username
```

## View Users

```bash
cat dockers/nginx/.htpasswd
```

---

## Test It

```bash
# Without password - should fail
curl http://localhost/

# With password - should work
curl -u username:password http://localhost/
```

---

## For AWS

Just deploy the same way on EC2:

1. Install Docker
2. Clone your code
3. Run `./dockers/create-auth.sh`
4. Run `docker compose -f docker-compose.nginx.yaml up -d`

Done!

---

## Files

- `nginx.conf` - Basic nginx settings
- `default.conf` - Just password check + proxy to app
- `.htpasswd` - Your usernames/passwords (encrypted)

Keep it simple! 😊
