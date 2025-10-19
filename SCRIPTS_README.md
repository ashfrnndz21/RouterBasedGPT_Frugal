# 📜 FrugalAIGpt Scripts

This document describes all available scripts in the FrugalAIGpt project.

## 🚀 Startup Scripts

### `startup.sh` - Production Startup (Linux/macOS)
**Purpose**: Automated startup for production deployment using Docker

**Usage**:
```bash
./startup.sh
```

**What it does**:
- Checks prerequisites (Docker, Docker Compose, Ollama)
- Starts Ollama service
- Pulls required AI models
- Builds and starts Docker containers
- Opens browser to app
- Displays helpful information

**Requirements**:
- Docker & Docker Compose
- Bash shell
- Ollama (optional)

---

### `startup-dev.sh` - Development Startup (Linux/macOS)
**Purpose**: Automated startup for local development without Docker

**Usage**:
```bash
./startup-dev.sh
```

**What it does**:
- Checks prerequisites (Node.js, npm, Ollama)
- Installs dependencies if needed
- Starts Ollama service
- Pulls required AI models
- Runs database migrations
- Starts Next.js development server

**Requirements**:
- Node.js 20+
- npm
- Bash shell
- Ollama (optional)

---

### `startup.bat` - Production Startup (Windows)
**Purpose**: Automated startup for Windows users using Docker

**Usage**:
```cmd
startup.bat
```

**What it does**:
- Checks prerequisites (Docker, Docker Compose)
- Creates config.toml if missing
- Builds and starts Docker containers
- Opens browser to app
- Displays helpful information

**Requirements**:
- Docker Desktop
- Windows Command Prompt

---

## 🧹 Utility Scripts

### `clean-history.sh` - Clean Chat History
**Purpose**: Remove all chat history and reset the database

**Usage**:
```bash
./clean-history.sh
```

**What it does**:
- Backs up current database
- Clears chat history
- Resets conversation data
- Preserves user preferences

**Warning**: This action cannot be undone (except from backup)

---

### `commit.sh` - Git Commit Helper
**Purpose**: Simplified git commit workflow

**Usage**:
```bash
./commit.sh "Your commit message"
```

**What it does**:
- Stages all changes
- Creates commit with message
- Optionally pushes to remote

---

### `reset-git.sh` - Git Reset Helper
**Purpose**: Reset git repository to clean state

**Usage**:
```bash
./reset-git.sh
```

**What it does**:
- Resets to last commit
- Cleans untracked files
- Restores working directory

**Warning**: This will discard all uncommitted changes

---

## 🐳 Docker Scripts

### `entrypoint.sh` - Docker Container Entrypoint
**Purpose**: Container initialization script

**Usage**: Automatically run by Docker

**What it does**:
- Sets up container environment
- Runs database migrations
- Starts the application
- Handles graceful shutdown

---

## 📦 NPM Scripts

Defined in `package.json`:

### Development
```bash
npm run dev              # Start development server
```

### Production
```bash
npm run build            # Build for production
npm run start            # Start production server
```

### Database
```bash
npm run db:migrate       # Run database migrations
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run format:write     # Format code with Prettier
```

---

## 🎯 Quick Reference

### First Time Setup
```bash
# Linux/macOS - Production
./startup.sh

# Linux/macOS - Development
./startup-dev.sh

# Windows - Production
startup.bat
```

### Daily Development
```bash
# Start dev server
./startup-dev.sh

# Or manually
npm run dev
```

### Production Deployment
```bash
# Docker
./startup.sh

# Or manually
docker compose up -d
```

### Maintenance
```bash
# Clean history
./clean-history.sh

# View logs
docker compose logs -f

# Restart services
docker compose restart
```

---

## 🔧 Making Scripts Executable

If scripts won't run, make them executable:

```bash
chmod +x startup.sh
chmod +x startup-dev.sh
chmod +x clean-history.sh
chmod +x commit.sh
chmod +x reset-git.sh
chmod +x entrypoint.sh
```

Or all at once:
```bash
chmod +x *.sh
```

---

## 📝 Script Conventions

All scripts follow these conventions:

1. **Colored Output**: Green (success), Yellow (warning), Red (error), Blue (info)
2. **Error Handling**: Exit on critical errors with helpful messages
3. **Prerequisites**: Check requirements before proceeding
4. **User Feedback**: Clear progress indicators and status messages
5. **Documentation**: Comments explaining each section

---

## 🛠️ Customizing Scripts

### Modify Startup Behavior

Edit the configuration section at the top of each script:

**startup.sh**:
```bash
# Configuration
APP_URL="http://localhost:3000"
OLLAMA_URL="http://localhost:11434"
REQUIRED_MODELS=("granite4:micro" "qwen3:1.7b")
```

### Add Custom Models

To pull additional models, edit the `REQUIRED_MODELS` array:

```bash
REQUIRED_MODELS=("granite4:micro" "qwen3:1.7b" "llama2:7b")
```

### Change Ports

Edit `docker-compose.yaml` for Docker mode:
```yaml
ports:
  - 3001:3000  # Change external port
```

Or set environment variable for dev mode:
```bash
PORT=3001 npm run dev
```

---

## 🐛 Debugging Scripts

### Enable Debug Mode

Add `-x` flag to bash scripts:
```bash
bash -x ./startup.sh
```

### View Script Output

Scripts log to stdout/stderr. Redirect to file:
```bash
./startup.sh 2>&1 | tee startup.log
```

### Check Exit Codes

```bash
./startup.sh
echo $?  # 0 = success, non-zero = error
```

---

## 📚 Related Documentation

- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Detailed startup guide
- [STARTUP_OPTIONS.md](STARTUP_OPTIONS.md) - All startup methods
- [STARTUP_FLOW.md](STARTUP_FLOW.md) - Visual startup flow
- [README.md](README.md) - Main documentation

---

## 🆘 Getting Help

If scripts don't work:

1. Check prerequisites are installed
2. Make scripts executable: `chmod +x *.sh`
3. Check error messages carefully
4. View logs: `docker compose logs -f`
5. Try manual startup method
6. Open an issue on GitHub

---

## 💡 Tips

1. **Keep Scripts Updated**: Pull latest changes regularly
2. **Backup Before Cleaning**: `clean-history.sh` is destructive
3. **Use Dev Mode**: Faster for development
4. **Check Logs**: Always check logs if something fails
5. **Read Error Messages**: Scripts provide helpful error messages

---

**Scripts make your life easier! Use them! 🚀**
