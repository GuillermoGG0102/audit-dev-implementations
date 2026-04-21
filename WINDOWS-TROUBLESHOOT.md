# Windows Setup & Troubleshooting Guide

## Quick Fix: If `npm run build` fails

Run these commands **in order** from Command Prompt or PowerShell:

```bash
# Step 1: Clean everything
rmdir /s /q node_modules
rmdir /s /q dist
del package-lock.json

# Step 2: Reinstall
npm install

# Step 3: Rebuild
npm run build

# Step 4: Verify (check that dist/ folder exists)
dir dist\src\cli\

# Step 5: Run audit
npm run audit -- --url https://www.tnkproject.com
```

---

## If "Cannot find module" error persists:

### Option A: Use explicit npx (Recommended)
```bash
npx tsc
node dist/src/cli/index.js audit --url https://www.tnkproject.com
```

### Option B: Check TypeScript is installed
```bash
npm list typescript
npx tsc --version
```

### Option C: Verify Node/npm versions
```bash
node --version
npm --version
```

---

## Common Windows Issues & Fixes

### Issue: "tsc: The TypeScript Compiler" help text appears
**Solution:** This means tsc is running but something's wrong with its config. Try:
```bash
npm run build -- --noEmit
npx tsc --listFiles
```

### Issue: dist/scripts/ folder doesn't exist
**Solution:** The scripts folder is optional. You can run tests instead:
```bash
npm test -- tests/integration/audit-flow.integration.test.ts
```

### Issue: Path issues with backslashes
**Solution:** Use forward slashes or quotes:
```bash
npm run audit -- --url https://www.tnkproject.com --output "./my-audit-results"
```

---

## Test Audit Step-by-Step

After successful build, run this:

```bash
# 1. Verify dist folder structure
dir dist\src\

# Should show:
# audit, browser, capture, cli, core, report, rules, utils

# 2. Run the audit
npm run audit -- --url https://www.tnkproject.com --verbose

# 3. Check output folder
dir my-audit-results\

# Should show:
# audit-results.json
# summary.json
# config.json
```

---

## Expected Output

```
╔════════════════════════════════════════════════════════════╗
║                  DL-AUDITOR TEST RUN                       ║
╚════════════════════════════════════════════════════════════╝

Testing audit flow against: https://www.tnkproject.com

[audit logs...]

════════════════════════════════════════════════════════════
AUDIT RUN COMPLETE
════════════════════════════════════════════════════════════
✓ Status: Success
  Message: Audit completed: 1 pages audited, X events captured
  Duration: X.XXs
  Output: C:\Users\...\my-audit-results\

✅ Audit Test Complete!
```

---

## Still Having Issues?

1. **Delete everything and start fresh:**
   ```bash
   rmdir /s /q node_modules dist
   del package-lock.json
   npm install
   npm run build
   ```

2. **Check tsconfig.json is valid:**
   ```bash
   npx tsc --showConfig
   ```

3. **Run with no cache:**
   ```bash
   npm cache clean --force
   npm install
   npm run build
   ```

4. **Use PowerShell instead of Command Prompt:**
   ```powershell
   # PowerShell handles npm better on some Windows versions
   npm run build
   npm run audit -- --url https://www.tnkproject.com
   ```

---

## Next: Run Integration Tests

Once build succeeds, run the comprehensive integration tests:

```bash
npm run test:integration
```

This will validate that all 4 phases work together correctly.
