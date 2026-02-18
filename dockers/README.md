# Docker Setup for FrugalAIGpt

This directory contains separate Docker images for the application and Ollama service, allowing them to run in parallel as independent containers.

## Structure

```
dockers/
├── app/
│   ├── Dockerfile          # Next.js application image (no Ollama)
│   └── entrypoint.sh       # Application startup script
├── ollama/
│   ├── Dockerfile          # Ollama service image
│   └── entrypoint.sh       # Ollama startup script with model pulling
├── docker-compose.yaml     # Orchestrates both services
└── README.md              # This file
```

## Services

### 1. Ollama Service (`ollama`)
- Runs Ollama server
- Automatically pulls required models at runtime
- Exposes port `11434`
- Models are persisted in `ollama-models` volume

### 2. Application Service (`app`)
- Runs Next.js application
- Connects to Ollama service via `http://ollama:11434`
- Exposes port `3000`
- Requires Ollama to be healthy before starting

## Usage

### Build App Image Only (No Ollama)

To build just the app image without Ollama:

```bash
# Using the build script
./dockers/build-app.sh

# Or directly with docker
cd /Users/chanderpal/Desktop/dev/aws/FrugalAI_BetaV2
docker build -f dockers/app/Dockerfile -t frugalaigpt-app:latest .
```

### Build and Start Services

From the project root directory:

```bash
cd dockers
docker compose up -d
```

Or from the project root:

```bash
docker compose -f dockers/docker-compose.yaml up -d
```

### Build Only

```bash
# Build both services
docker compose -f dockers/docker-compose.yaml build

# Build only app
docker compose -f dockers/docker-compose.yaml build app

# Build only Ollama
docker compose -f dockers/docker-compose.yaml build ollama
```

### View Logs

```bash
# All services
docker compose -f dockers/docker-compose.yaml logs -f

# Specific service
docker compose -f dockers/docker-compose.yaml logs -f ollama
docker compose -f dockers/docker-compose.yaml logs -f app
```

### Stop Services

```bash
docker compose -f dockers/docker-compose.yaml down
```

### Stop and Remove Volumes

```bash
docker compose -f dockers/docker-compose.yaml down -v
```

## Configuration

### Customize Models to Pull

Edit `docker-compose.yaml` and modify the `OLLAMA_MODELS` environment variable:

```yaml
environment:
  - OLLAMA_MODELS=granite4:micro qwen3:1.7b qwen3-embedding:0.6b
```

### Application Configuration

Create a `config.toml` file in the project root (or copy from `sample.config.toml`):

```toml
[MODELS.OLLAMA]
API_URL = "http://ollama:11434"
```

The docker-compose file will mount this config file into the app container.

## Volumes

- `ollama-models`: Persists Ollama models (so they don't need to be re-downloaded)
- `app-data`: Application data directory
- `app-uploads`: User uploads directory

## Health Checks

Both services have health checks:
- **Ollama**: Checks `/api/tags` endpoint
- **App**: Checks `/api/health` endpoint

The app service waits for Ollama to be healthy before starting.

## Ports

- **Application**: `http://localhost:3000`
- **Ollama**: `http://localhost:11434`

## Image Size Optimization

The Ollama Dockerfile uses the official `ollama/ollama` image which is pre-optimized (~1.2GB for CPU-only). This is much smaller than installing Ollama from scratch which includes large CUDA libraries.

### If You Still Have Space Issues

1. **Clean up Docker system:**
   ```bash
   docker system prune -a --volumes
   ```

2. **Use CPU-only alternative** (if you don't need GPU):
   - The `Dockerfile.cpu-only` uses Alpine Linux for a smaller base
   - To use it, update `docker-compose.yaml`:
     ```yaml
     ollama:
       build:
         context: ..
         dockerfile: dockers/ollama/Dockerfile.cpu-only
     ```

3. **Check Docker disk usage:**
   ```bash
   docker system df
   ```

## Troubleshooting

### Models Not Pulling

Check Ollama logs:
```bash
docker logs frugalaigpt-ollama
```

Manually pull models:
```bash
docker exec -it frugalaigpt-ollama ollama pull granite4:micro
```

### App Can't Connect to Ollama

1. Verify Ollama is healthy:
   ```bash
   docker compose -f dockers/docker-compose.yaml ps
   ```

2. Check if Ollama is accessible:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Verify `OLLAMA_API_URL` in app container:
   ```bash
   docker exec frugalaigpt-app env | grep OLLAMA
   ```

### Rebuild After Changes

If you modify Dockerfiles or entrypoint scripts:
```bash
docker compose -f dockers/docker-compose.yaml build --no-cache
docker compose -f dockers/docker-compose.yaml up -d
```

### "No Space Left on Device" Error

If you encounter disk space issues during build:

1. **Clean up unused Docker resources:**
   ```bash
   docker system prune -a --volumes
   ```

2. **Remove old images:**
   ```bash
   docker image prune -a
   ```

3. **Check available space:**
   ```bash
   df -h
   docker system df
   ```

4. **The current Dockerfile uses the official Ollama image** which is already optimized. If you still have issues, consider using the CPU-only alternative or increasing Docker's disk space allocation.
