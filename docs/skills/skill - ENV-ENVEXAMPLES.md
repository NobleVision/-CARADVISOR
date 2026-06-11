# Environment Variable Management Skill
A standardized process for auditing, synchronizing, and maintaining `.env` and `.env.example` files to ensure consistency, completeness, and developer clarity across projects.
**Last Updated:** June 3, 2026  
**Based On:** NuFounders platform environment reorganization  
---
## 1. Codebase Audit & Verification
Before modifying `.env` or `.env.example`, you must understand the ground truth: which variables the codebase actually references versus which are documented.
### 1.1 Discover All Environment Variable References
Search the codebase for all `process.env` references and configuration object usages:
**PowerShell (Windows):**
```powershell
# Find all process.env references
Get-ChildItem -Recurse -Path "server","api-src","shared","client/src" -Include "*.ts","*.tsx","*.js","*.jsx" | 
    Select-String -Pattern "process\.env\.(\w+)" -AllMatches | 
    ForEach-Object { $_.Matches } | 
    ForEach-Object { $_.Groups[1].Value } | 
    Sort-Object -Unique
# Find ENV object references (if using a consolidated env.ts pattern)
Get-ChildItem -Path "server/_core" -Include "env.ts" | 
    Select-String -Pattern "process\.env\.(\w+)" | 
    ForEach-Object { $_.Matches.Groups[1].Value } | 
    Sort-Object -Unique
```
**Bash (macOS/Linux):**
```bash
# Find all process.env references
grep -rEoh "process\.env\.([A-Z_0-9]+)" server/ api-src/ shared/ client/src/ 2>/dev/null | 
    sed 's/process\.env\.//' | 
    sort -u
# Cross-reference with configuration objects
grep -rEoh "ENV\.[a-zA-Z_]+" server/ api-src/ | sort -u
```
**IDE Search (VS Code / Windsurf):**
- Search: `process\.env\.([A-Z_][A-Z_0-9]*)`
- Files to include: `server/**/*,api-src/**/*,shared/**/*,client/src/**/*`
- Enable regex, review all matches
### 1.2 Identify Missing Variables
Compare discovered variables against existing `.env` and `.env.example`:
```powershell
# Load discovered keys
$discovered = Get-Content "discovered-keys.txt"
# Load current env keys (filter comments and blanks)
$envKeys = Get-Content ".env" | Where-Object { $_ -match '^[A-Z_][A-Z_0-9]*=' } | 
    ForEach-Object { ($_ -split '=')[0] }
# Load example keys
$exampleKeys = Get-Content ".env.example" | Where-Object { $_ -match '^[A-Z_][A-Z_0-9]*=' } | 
    ForEach-Object { ($_ -split '=')[0] }
# Find missing in .env
$missingInEnv = $discovered | Where-Object { $_ -notin $envKeys }
Write-Host "Missing in .env:" -ForegroundColor Yellow
$missingInEnv
# Find missing in .env.example
$missingInExample = $discovered | Where-Object { $_ -notin $exampleKeys }
Write-Host "`nMissing in .env.example:" -ForegroundColor Yellow
$missingInExample
```
**Decision Matrix for Missing Variables:**
| Scenario | Action | Example |
|----------|--------|---------|
| Referenced in code, not in `.env` | Add blank placeholder with comment | `OPENAI_API=` |
| Referenced in code, not in `.env.example` | Add with documentation comment | `PINECONE_INDEX_NAME=nufounders # Vector DB index name` |
| Local-only variable (backup scripts, etc.) | Keep in `.env` only, exclude from `.env.example` | `SOURCE_DIRECTORY=` |
| Aliased variable (e.g., `NEO4J_USER` vs `NEO4J_USERNAME`) | Add both in `.env`, document in `.env.example` | Both keys present with explanatory comment |
### 1.3 Identify Orphaned Variables
Find variables present in `.env` files but not referenced in code:
```powershell
$envKeys | Where-Object { $_ -notin $discovered } | 
    ForEach-Object { Write-Host "Orphaned: $_" -ForegroundColor Red }
```
**Handling Orphans:**
- **Delete if definitely unused** (after confirming no dynamic access via `process.env[variableName]`)
- **Keep with comment if intentionally reserved** for future use
- **Move to local-only section** if used by local scripts but not production code
---
## 2. Synchronization Logic
### 2.1 Maintain Identical Key Order
`.env` and `.env.example` must follow the exact same section order. This enables visual diffing and prevents drift.
**Standard Section Order:**
```
1. Database
2. Authentication (JWT, Session)
3. OAuth Providers (Google, GitHub, etc.)
4. AI Services (OpenAI, Z.ai, Gemini, etc.)
5. File/Asset Storage (Cloudinary, S3, etc.)
6. Analytics/Metrics (InfluxDB, etc.)
7. Voice/SMS (Twilio, ElevenLabs)
8. Graph/Vector DB (Neo4j, Pinecone)
9. Email Services (Resend, SMTP)
10. Payments (Stripe)
11. Cron/Scheduling
12. Admin/Operational
13. Feature Toggles
14. Local-Only (backup scripts, local dev tools)
```
### 2.2 Reordering Algorithm
When reordering `.env` to match `.env.example`:
```powershell
$exampleLines = Get-Content ".env.example"
$envContent = Get-Content ".env" | Out-String
$result = @()
$currentComments = @()
$localOnlyVars = @()
foreach ($line in $exampleLines) {
    # Capture comments for sharing
    if ($line -match '^\s*#') {
        $currentComments += $line
        continue
    }
    
    # Extract key from example
    if ($line -match '^([A-Z_][A-Z_0-9]*)=') {
        $key = $Matches[1]
        
        # Find matching line in .env (preserve its value, discard example's placeholder)
        $envLine = $envContent -split "`n" | 
            Where-Object { $_ -match "^$key\s*=" }
        
        if ($envLine) {
            # Output accumulated comments first (shared documentation)
            $result += $currentComments
            $currentComments = @()
            
            # Output the .env line with its actual value
            $result += $envLine
        } else {
            # Key exists in example but not in .env — add blank placeholder
            $result += $currentComments
            $currentComments = @()
            $result += "$key="
        }
    }
}
# Append local-only variables at end (preserve but separate)
$result += ""
$result += "# Local Backup Script Settings (NOT for Vercel / production)"
$result += $localOnlyVars
$result | Set-Content ".env" -Encoding UTF8
```
### 2.3 Share Comments Between Files
Comments should be mirrored in both files so that context is never lost:
**`.env.example` (template with full documentation):**
```bash
# OpenAI API — used for TTS and Pinecone text embeddings
# Primary key: OPENAI_API (used by server/_core/env.ts)
# Fallback alias: OPENAI_API_KEY (used by pineconeService.ts directly)
OPENAI_API=sk-...
OPENAI_API_KEY=${OPENAI_API}  # Alias for backward compatibility
# Custom OpenAI-compatible endpoint (optional)
# Default: https://api.openai.com/v1
OPENAI_API_URL=https://api.openai.com/v1
```
**`.env` (actual values, same comments preserved):**
```bash
# OpenAI API — used for TTS and Pinecone text embeddings
# Primary key: OPENAI_API (used by server/_core/env.ts)
# Fallback alias: OPENAI_API_KEY (used by pineconeService.ts directly)
OPENAI_API=sk-prod-key-here
OPENAI_API_KEY=sk-prod-key-here
# Custom OpenAI-compatible endpoint (optional)
# Default: https://api.openai.com/v1
OPENAI_API_URL=https://api.openai.com/v1
```
---
## 3. Formatting Standards
### 3.1 Visual Alignment
Align `=` signs within sections for readability:
```bash
# Good — aligned, easy to scan
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-32-chars-min
CRON_SECRET=bearer-token-here
# Avoid — ragged, harder to scan
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-32-chars-min
CRON_SECRET=bearer-token-here
```
**PowerShell alignment helper:**
```powershell
$content = Get-Content ".env" -Raw
$lines = $content -split "`n"
$maxKeyLength = ($lines | Where-Object { $_ -match '^[A-Z_]' } | 
    ForEach-Object { ($_ -split '=')[0].Length } | Measure-Object -Maximum).Maximum
$aligned = $lines | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z_0-9]*)=(.*)$') {
        $key = $Matches[1]
        $val = $Matches[2]
        $paddedKey = $key.PadRight($maxKeyLength)
        "$paddedKey=$val"
    } else { $_ }
}
$aligned | Set-Content ".env" -Encoding UTF8
```
### 3.2 Distinguishing Sensitive vs. Placeholder Values
| File | Value Type | Example |
|------|------------|---------|
| `.env` | Real secrets/keys | `OPENAI_API=sk-prod-abc123` |
| `.env.example` | Placeholder/description | `OPENAI_API=sk-... # Get from https://platform.openai.com` |
| `.env` | Real connection strings | `DATABASE_URL=postgresql://user:pass@neon.tech/db` |
| `.env.example` | Template pattern | `DATABASE_URL=postgresql://user:pass@host/db` |
**Never commit `.env`**. Always commit `.env.example` as living documentation.
### 3.3 Comment Conventions
```bash
# Section header — blank line before, descriptive
# ============================================
# Database
# ============================================
# Inline comment — explain the variable's purpose
# URL format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://...
# Boolean flag — note the default
# Set to "true" to enable local business hours constraint (default: false)
OUTREACH_LOCAL_BUSINESS_HOURS=false
# Deprecated/Alias — clearly marked
# LEGACY ALIAS: Some older services read this key directly
# Prefer DATABASE_URL for new code
LEGACY_DB_URL=${DATABASE_URL}
```
---
## 4. Workflow Example: Adding a New Feature
When building a feature that requires a new environment variable (e.g., integrating a new AI provider):
### Step-by-Step Checklist
- [ ] **1. Identify the variable name**
  - Use `SCREAMING_SNAKE_CASE`: `NEW_PROVIDER_API_KEY`
  - Check for naming collisions in existing `.env.example`
- [ ] **2. Implement in code first**
  ```typescript
  // server/_core/env.ts
  newProviderApiKey: process.env.NEW_PROVIDER_API_KEY || '',
  
  // server/services/newProvider.ts
  if (!ENV.newProviderApiKey) {
    throw new Error('NEW_PROVIDER_API_KEY not configured');
  }
  ```
- [ ] **3. Add to `.env.example` with documentation**
  ```bash
  # ============================================
  # New AI Provider Integration
  # ============================================
  
  # API key from https://newprovider.com/dashboard
  # Required for the AI feature in Career Matching
  NEW_PROVIDER_API_KEY=sk-...
  
  # Optional: override the default endpoint
  NEW_PROVIDER_API_URL=https://api.newprovider.com/v1
  ```
- [ ] **4. Add blank placeholder to `.env`**
  ```bash
  # ============================================
  # New AI Provider Integration
  # ============================================
  
  # API key from https://newprovider.com/dashboard
  # Required for the AI feature in Career Matching
  NEW_PROVIDER_API_KEY=
  
  # Optional: override the default endpoint
  NEW_PROVIDER_API_URL=https://api.newprovider.com/v1
  ```
- [ ] **5. Ensure section placement matches `.env.example`**
  - If `.env.example` places this under "AI Services", `.env` must also place it there
  - Reorder if necessary to maintain sync
- [ ] **6. Update documentation**
  - Add row to `README.md` Environment Variables table
  - Update `docs/DEPLOYMENT.md` if full setup instructions needed
- [ ] **7. Test locally**
  ```bash
  pnpm check        # TypeScript validation
  pnpm test         # Unit tests
  pnpm dev          # Smoke test the feature
  ```
- [ ] **8. Configure in Vercel (production)**
  - Add `NEW_PROVIDER_API_KEY` to Production, Preview, and Development environments
  - Trigger redeploy to pick up new env vars
- [ ] **9. Verify in production**
  - Check feature functionality
  - Review Vercel logs for any env-related errors
---
## 5. Validation Commands
Run these after any `.env` / `.env.example` modification:
```powershell
# Check for duplicate keys in .env
$envKeys = Get-Content ".env" | Where-Object { $_ -match '^[A-Z_]' } | 
    ForEach-Object { ($_ -split '=')[0] }
$dupes = $envKeys | Group-Object | Where-Object { $_.Count -gt 1 }
if ($dupes) { Write-Error "Duplicates found: $($dupes.Name)" } 
else { Write-Host "✓ No duplicate keys in .env" -ForegroundColor Green }
# Check for duplicate keys in .env.example
$exKeys = Get-Content ".env.example" | Where-Object { $_ -match '^[A-Z_]' } | 
    ForEach-Object { ($_ -split '=')[0] }
$dupes = $exKeys | Group-Object | Where-Object { $_.Count -gt 1 }
if ($dupes) { Write-Error "Duplicates found: $($dupes.Name)" }
else { Write-Host "✓ No duplicate keys in .env.example" -ForegroundColor Green }
# Verify key counts match
Write-Host "`n.env keys: $($envKeys.Count)"
Write-Host ".env.example keys: $($exKeys.Count)"
Write-Host "Common keys: $(($envKeys | Where-Object { $_ -in $exKeys }).Count)"
```
---
## Appendix A: Common Patterns
### Aliased Variables
When code references multiple possible env var names (for backward compatibility):
```typescript
// server/services/someService.ts
const apiKey = process.env.OPENAI_API || process.env.OPENAI_API_KEY;
```
Both must exist in `.env`:
```bash
OPENAI_API=sk-...
OPENAI_API_KEY=sk-...
```
And be documented in `.env.example`:
```bash
# Primary key (preferred)
OPENAI_API=sk-...
# Fallback alias (used by pineconeService.ts)
OPENAI_API_KEY=${OPENAI_API}
```
### Conditional/Optional Variables
Variables with defaults in code should still appear in `.env.example` with blank values:
```typescript
// server/_core/env.ts
zaiRequestTimeoutMs: parseInt(process.env.ZAI_REQUEST_TIMEOUT_MS || '90000', 10),
```
`.env.example`:
```bash
# Optional: Z.ai HTTP timeout in milliseconds
# Default: 90000 (90 seconds)
ZAI_REQUEST_TIMEOUT_MS=90000
```
### Local-Only Variables
Keep local development tools separate:
```bash
# .env (bottom of file)
# ============================================
# Local Backup Script Settings (NOT for Vercel / production)
# ============================================
SOURCE_DIRECTORY=C:\Projects\MyApp
DESTINATION_FILE=\\BackupServer\Backups\myapp.zip
EXCLUDE_FILES=*.log,*.tmp
EXCLUDE_DIRS=node_modules,.git,dist
```
These **must not** appear in `.env.example`.
---
## Appendix B: Troubleshooting
| Issue | Symptom | Solution |
|-------|---------|----------|
| Variable not recognized | `undefined` in logs | Check `.env` for typos; verify key matches code exactly |
| Neo4j won't connect | Silent fallback to no-op | Ensure `NEO4J_USER` is set (service reads this, not `NEO4J_USERNAME`) |
| Pinecone embeddings fail | 401 from OpenAI | Set `OPENAI_API` **or** `OPENAI_API_KEY` — service checks both |
| ElevenLabs widget missing | Admin panel shows empty | Add `VITE_ELEVENLABS_AGENT_ID` to Vercel (client-side env var) |
| Env var in code but not in Vercel | Works locally, fails in prod | Compare `.env` against Vercel dashboard; env vars aren't auto-synced |
| Duplicate key warnings | Build-time lint errors | Run validation commands in Section 5; remove duplicates |
---
