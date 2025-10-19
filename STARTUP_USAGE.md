# 🚀 Startup Script Usage Guide

Complete guide for using the FrugalAIGpt startup scripts with all options and features.

## 📋 Quick Reference

### Start Application
```bash
# Production (Docker)
./startup.sh

# Development (Local)
./startup-dev.sh

# Windows
startup.bat
```

### Reset Application
```bash
# Production (Docker)
./startup.sh --reset

# Development (Local)
./startup-dev.sh --reset

# Windows
startup.bat reset
```

## 🎯 Features

### ✅ Automatic Port Management
- **Always uses port 3000** for the frontend
- **Automatically detects** if port is in use
- **Offers to free** the port automatically
- **Kills conflicting processes** with user confirmation

### 🔄 Reset Functionality
- **Complete reset** of application state
- **Removes all data** (database, uploads)
- **Clears Docker volumes** (production mode)
- **Frees up ports** automatically
- **Safe with confirmation** prompt

### 🚀 Full Automation
- **Checks prerequisites** automatically
- **Starts Ollama** if needed
- **Pulls AI models** automatically
- **Starts services** (Docker or dev server)
- **Opens browser** when ready
- **Shows helpful info** and commands

## 📖 Detailed Usage

### Production Mode (Docker)

#### Normal Startup
```bash
./startup.sh
```

**What happens:**
1. Checks Docker, Docker Compose, Ollama
2. Verifies port 3000 is available (frees if needed)
3. Starts Ollama service
4. Pulls granite4:micro and qwen3:1.7b models
5. Builds and starts Docker containers
6. Waits for app to be ready
7. Opens browser to http://localhost:3000
8. Shows status and helpful commands

**Time:** ~30 seconds (after first run)

#### Reset and Restart
```bash
./startup.sh --reset
```

**What happens:**
1. Asks for confirmation (type "yes")
2. Stops all Docker containers
3. Removes all volumes (data, uploads)
4. Clears local database files
5. Frees port 3000
6. Exits (ready for fresh start)

**Then start fresh:**
```bash
./startup.sh
```

---

### Development Mode (Local)

#### Normal Startup
```bash
./startup-dev.sh
```

**What happens:**
1. Checks Node.js 20+, npm, Ollama
2. Installs dependencies if needed
3. Verifies port 3000 is available (frees if needed)
4. Starts Ollama service
5. Pulls required AI models
6. Runs database migrations
7. Starts Next.js dev server
8. App available at http://localhost:3000

**Time:** ~10-20 seconds

**Features:**
- Hot reload enabled
- Fast iteration
- No Docker overhead
- Direct file access

#### Reset and Restart
```bash
./startup-dev.sh --reset
```

**What happens:**
1. Asks for confirmation (type "yes")
2. Stops any running dev servers
3. Removes database files
4. Clears uploads directory
5. Removes .next build cache
6. Frees port 3000
7. Exits (ready for fresh start)

**Then start fresh:**
```bash
./startup-dev.sh
```

---

### Windows Mode (Docker)

#### Normal Startup
```cmd
startup.bat
```

**What happens:**
1. Checks Docker Desktop
2. Creates config.toml if missing
3. Builds and starts Docker containers
4. Waits for app to be ready
5. Opens browser to http://localhost:3000
6. Shows status and commands

#### Reset and Restart
```cmd
startup.bat reset
```

**What happens:**
1. Asks for confirmation (type "yes")
2. Stops all Docker containers
3. Removes all volumes
4. Clears local data files
5. Exits (ready for fresh start)

**Then start fresh:**
```cmd
startup.bat
```

---

## 🔧 Port Management

### Automatic Port Detection

The scripts automatically check if port 3000 is in use:

```
⚠ Port 3000 is already in use
Would you like to free up port 3000? (y/n):
```

**Options:**
- **y** - Automatically kills the process and continues
- **n** - Exits with instructions to free manually

### Manual Port Cleanup

If you need to manually free port 3000:

**macOS/Linux:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**Windows:**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Why Port 3000?

- **Standard Next.js port** - Default for Next.js apps
- **Consistent access** - Always http://localhost:3000
- **No configuration needed** - Works out of the box
- **Easy to remember** - Standard development port

---

## 🔄 Reset Scenarios

### When to Reset

Use reset when you want to:
- **Start completely fresh** - Clean slate
- **Clear all data** - Remove old conversations
- **Fix corruption** - Database issues
- **Free up space** - Remove old uploads
- **Test from scratch** - Clean testing environment

### What Gets Reset

#### Production Mode (Docker)
```
✓ Docker containers stopped
✓ Docker volumes removed
✓ Database files cleared
✓ Upload files removed
✓ Port 3000 freed
✗ Docker images kept (for faster restart)
✗ Ollama models kept (no need to re-download)
✗ config.toml kept (your settings preserved)
```

#### Development Mode (Local)
```
✓ Dev server stopped
✓ Database files cleared
✓ Upload files removed
✓ .next cache cleared
✓ Port 3000 freed
✗ node_modules kept (no need to reinstall)
✗ Ollama models kept (no need to re-download)
✗ config.toml kept (your settings preserved)
```

### What's Preserved

**Always kept:**
- Ollama models (granite4:micro, qwen3:1.7b)
- config.toml (your API keys and settings)
- Docker images (production mode)
- node_modules (development mode)
- Source code (obviously!)

---

## 🎬 Example Workflows

### First Time Setup
```bash
# Clone repository
git clone https://github.com/ashfrnndz21/FrugalAI_Gpt_Beta.git
cd FrugalAI_Gpt_Beta

# Start app (production)
./startup.sh

# Wait for models to download (5-10 minutes first time)
# App opens automatically when ready
```

### Daily Development
```bash
# Start dev server
./startup-dev.sh

# Make changes to code
# Hot reload updates automatically

# Press Ctrl+C to stop when done
```

### Testing Fresh Install
```bash
# Reset everything
./startup-dev.sh --reset

# Confirm with "yes"

# Start fresh
./startup-dev.sh

# Test as if first-time user
```

### Switching Modes
```bash
# Stop production
docker compose down

# Start development
./startup-dev.sh

# Later, stop development (Ctrl+C)

# Start production
./startup.sh
```

### Fixing Port Conflicts
```bash
# If port 3000 is stuck
./startup.sh --reset

# Or manually
lsof -ti:3000 | xargs kill -9

# Then start normally
./startup.sh
```

---

## 🛠️ Troubleshooting

### Script Won't Run

**Problem:** `Permission denied`

**Solution:**
```bash
chmod +x startup.sh startup-dev.sh
```

---

### Port Still in Use After Reset

**Problem:** Port 3000 still blocked

**Solution:**
```bash
# Force kill all processes on port 3000
lsof -ti:3000 | xargs kill -9

# Or restart your computer
```

---

### Docker Won't Start

**Problem:** Docker containers fail to start

**Solution:**
```bash
# Reset Docker
./startup.sh --reset

# Clean Docker system
docker system prune -a

# Restart Docker Desktop

# Try again
./startup.sh
```

---

### Models Won't Pull

**Problem:** Ollama models fail to download

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434

# Pull manually
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Check disk space
df -h

# Try again
./startup.sh
```

---

### Dev Server Won't Start

**Problem:** `npm run dev` fails

**Solution:**
```bash
# Reset and clean
./startup-dev.sh --reset

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
./startup-dev.sh
```

---

## 💡 Pro Tips

### 1. Keep Ollama Running
Don't stop Ollama between sessions for faster startups.

### 2. Use Dev Mode for Development
Much faster iteration with hot reload.

### 3. Reset Before Demos
Start with clean data for presentations.

### 4. Check Logs First
Before resetting, check logs to understand issues:
```bash
docker compose logs -f  # Production
# Or check console output in dev mode
```

### 5. Backup Before Reset
If you have important data:
```bash
# Backup database
cp data/app.db data/app.db.backup

# Then reset
./startup.sh --reset
```

### 6. Use Reset for Clean Testing
Test features from scratch without old data interfering.

### 7. Monitor Port Usage
Keep an eye on what's using port 3000:
```bash
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

---

## 📊 Comparison: Normal vs Reset

| Aspect | Normal Startup | Reset + Startup |
|--------|---------------|-----------------|
| **Time** | 30 seconds | 1-2 minutes |
| **Data** | Preserved | Cleared |
| **Models** | Kept | Kept |
| **Config** | Kept | Kept |
| **Port** | Checked | Freed |
| **Use Case** | Daily use | Fresh start |

---

## 🎯 Best Practices

### Development Workflow
```bash
# Morning: Start dev server
./startup-dev.sh

# Work on features with hot reload

# Evening: Stop (Ctrl+C)

# Weekly: Reset for clean testing
./startup-dev.sh --reset
./startup-dev.sh
```

### Production Deployment
```bash
# Initial setup
./startup.sh

# Updates: Pull changes and restart
git pull
docker compose down
docker compose up -d --build

# Major changes: Reset and restart
./startup.sh --reset
./startup.sh
```

### Testing Workflow
```bash
# Test scenario 1
./startup-dev.sh
# ... test ...
# Ctrl+C

# Test scenario 2 (fresh)
./startup-dev.sh --reset
./startup-dev.sh
# ... test ...
```

---

## 📚 Related Documentation

- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Detailed guide
- [STARTUP_OPTIONS.md](STARTUP_OPTIONS.md) - All methods
- [STARTUP_FLOW.md](STARTUP_FLOW.md) - Visual flow
- [SCRIPTS_README.md](SCRIPTS_README.md) - All scripts

---

**Master the startup scripts for effortless development! 🚀**
