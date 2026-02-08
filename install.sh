#!/bin/bash
# =============================================================================
# DevLog Installer
# Installs the DevLog development utility into a Next.js project.
# Created by Allan Stevens and Claude Code (Anthropic).
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          DevLog Installer            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Determine the directory where this script lives (the package dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine the target project directory (default: current working directory)
TARGET_DIR="${1:-.}"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo -e "${BLUE}Package source:${NC} $SCRIPT_DIR"
echo -e "${BLUE}Target project:${NC} $TARGET_DIR"
echo ""

# --- Validations ---

# Check for Next.js project
if [ ! -f "$TARGET_DIR/next.config.ts" ] && [ ! -f "$TARGET_DIR/next.config.js" ] && [ ! -f "$TARGET_DIR/next.config.mjs" ]; then
  echo -e "${RED}Error: No next.config.{ts,js,mjs} found in $TARGET_DIR${NC}"
  echo "DevLog requires a Next.js project with App Router."
  exit 1
fi

# Check for src directory
if [ ! -d "$TARGET_DIR/src" ]; then
  echo -e "${RED}Error: No src/ directory found in $TARGET_DIR${NC}"
  echo "DevLog expects a src/ directory layout (src/app, src/components, src/lib)."
  exit 1
fi

# Check for package.json
if [ ! -f "$TARGET_DIR/package.json" ]; then
  echo -e "${RED}Error: No package.json found in $TARGET_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Next.js project detected"

# --- Step 1: Install dependencies ---

echo ""
echo -e "${YELLOW}Step 1/6:${NC} Installing better-sqlite3..."

cd "$TARGET_DIR"

if grep -q '"better-sqlite3"' package.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} better-sqlite3 already installed"
else
  npm install better-sqlite3
  npm install -D @types/better-sqlite3
  echo -e "${GREEN}✓${NC} better-sqlite3 installed"
fi

# --- Step 2: Copy source files ---

echo ""
echo -e "${YELLOW}Step 2/6:${NC} Copying DevLog source files..."

# Create directories
mkdir -p "$TARGET_DIR/src/lib/devlog"
mkdir -p "$TARGET_DIR/src/app/api/devlog/entries/[entryId]/attachments"
mkdir -p "$TARGET_DIR/src/app/api/devlog/attachments/[id]"
mkdir -p "$TARGET_DIR/src/app/api/devlog/count"
mkdir -p "$TARGET_DIR/src/app/api/devlog/export"
mkdir -p "$TARGET_DIR/src/components/devlog"

# Copy core library
cp "$SCRIPT_DIR/src/lib/devlog/types.ts"  "$TARGET_DIR/src/lib/devlog/"
cp "$SCRIPT_DIR/src/lib/devlog/db.ts"     "$TARGET_DIR/src/lib/devlog/"
cp "$SCRIPT_DIR/src/lib/devlog/api.ts"    "$TARGET_DIR/src/lib/devlog/"

# Copy API routes
cp "$SCRIPT_DIR/src/app/api/devlog/entries/route.ts"                         "$TARGET_DIR/src/app/api/devlog/entries/"
cp "$SCRIPT_DIR/src/app/api/devlog/entries/[entryId]/route.ts"               "$TARGET_DIR/src/app/api/devlog/entries/[entryId]/"
cp "$SCRIPT_DIR/src/app/api/devlog/entries/[entryId]/attachments/route.ts"   "$TARGET_DIR/src/app/api/devlog/entries/[entryId]/attachments/"
cp "$SCRIPT_DIR/src/app/api/devlog/attachments/[id]/route.ts"               "$TARGET_DIR/src/app/api/devlog/attachments/[id]/"
cp "$SCRIPT_DIR/src/app/api/devlog/count/route.ts"                          "$TARGET_DIR/src/app/api/devlog/count/"
cp "$SCRIPT_DIR/src/app/api/devlog/export/route.ts"                         "$TARGET_DIR/src/app/api/devlog/export/"

# Copy components
cp "$SCRIPT_DIR/src/components/devlog/index.ts"                   "$TARGET_DIR/src/components/devlog/"
cp "$SCRIPT_DIR/src/components/devlog/devlog-widget.tsx"          "$TARGET_DIR/src/components/devlog/"
cp "$SCRIPT_DIR/src/components/devlog/devlog-fab.tsx"             "$TARGET_DIR/src/components/devlog/"
cp "$SCRIPT_DIR/src/components/devlog/entry-form-dialog.tsx"      "$TARGET_DIR/src/components/devlog/"
cp "$SCRIPT_DIR/src/components/devlog/entries-viewer-dialog.tsx"  "$TARGET_DIR/src/components/devlog/"

FILE_COUNT=$(find "$TARGET_DIR/src/lib/devlog" "$TARGET_DIR/src/app/api/devlog" "$TARGET_DIR/src/components/devlog" -type f | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Copied $FILE_COUNT files"

# --- Step 3: Copy Claude Code commands ---

echo ""
echo -e "${YELLOW}Step 3/6:${NC} Copying Claude Code slash commands..."

mkdir -p "$TARGET_DIR/.claude/commands"
cp "$SCRIPT_DIR/.claude/commands/devlog.md"          "$TARGET_DIR/.claude/commands/"
cp "$SCRIPT_DIR/.claude/commands/install-devlog.md"  "$TARGET_DIR/.claude/commands/"

echo -e "${GREEN}✓${NC} Copied /devlog and /install-devlog commands"

# --- Step 4: Update next.config ---

echo ""
echo -e "${YELLOW}Step 4/6:${NC} Checking next.config..."

NEXT_CONFIG=""
for ext in ts js mjs; do
  if [ -f "$TARGET_DIR/next.config.$ext" ]; then
    NEXT_CONFIG="$TARGET_DIR/next.config.$ext"
    break
  fi
done

if grep -q "better-sqlite3" "$NEXT_CONFIG" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} serverExternalPackages already includes better-sqlite3"
else
  echo -e "${YELLOW}⚠${NC}  You need to add this to your next.config:"
  echo ""
  echo "    serverExternalPackages: ['better-sqlite3'],"
  echo ""
  echo "    Add it inside your NextConfig object."
fi

# --- Step 5: Update .gitignore ---

echo ""
echo -e "${YELLOW}Step 5/6:${NC} Updating .gitignore..."

if [ -f "$TARGET_DIR/.gitignore" ]; then
  if grep -q ".devlog/" "$TARGET_DIR/.gitignore" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .devlog/ already in .gitignore"
  else
    echo "" >> "$TARGET_DIR/.gitignore"
    echo "# DevLog local data" >> "$TARGET_DIR/.gitignore"
    echo ".devlog/" >> "$TARGET_DIR/.gitignore"
    echo -e "${GREEN}✓${NC} Added .devlog/ to .gitignore"
  fi
else
  echo ".devlog/" > "$TARGET_DIR/.gitignore"
  echo -e "${GREEN}✓${NC} Created .gitignore with .devlog/"
fi

# --- Step 6: Environment variable ---

echo ""
echo -e "${YELLOW}Step 6/6:${NC} Checking environment..."

ENV_FILE="$TARGET_DIR/.env.local"
if [ -f "$ENV_FILE" ] && grep -q "NEXT_PUBLIC_SHOW_DEV_TOOLS" "$ENV_FILE" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SHOW_DEV_TOOLS already set"
else
  if [ -f "$ENV_FILE" ]; then
    echo "" >> "$ENV_FILE"
  fi
  echo "NEXT_PUBLIC_SHOW_DEV_TOOLS=true" >> "$ENV_FILE"
  echo -e "${GREEN}✓${NC} Added NEXT_PUBLIC_SHOW_DEV_TOOLS=true to .env.local"
fi

# --- Done ---

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  DevLog installed successfully!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "Remaining manual steps:"
echo ""
echo "  1. Add serverExternalPackages: ['better-sqlite3'] to next.config (if not already done)"
echo ""
echo "  2. Add <DevLogWidget /> to your root layout:"
echo ""
echo "     import { DevLogWidget } from '@/components/devlog';"
echo ""
echo "     // In your layout body, after providers:"
echo "     <DevLogWidget />"
echo ""
echo "  3. Restart your dev server"
echo ""
echo -e "The ${BLUE}B${NC} button will appear in the bottom-right corner of every page."
echo ""
