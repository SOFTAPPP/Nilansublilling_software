# VPS SETUP — COPY/PASTE STEPS (do this EXACTLY in order)

Good news: you do NOT need to clone anything, you do NOT need to run prisma
commands manually, you do NOT need to create the database or .env yourself.
One script from your PC does ALL of it on the VPS automatically.

============================================================
STEP 1 — On your PC: open PowerShell (not inside the VPS)
============================================================
Press Windows key, type "powershell", press Enter.

============================================================
STEP 2 — Go to the project folder. COPY/PASTE this line:
============================================================
cd C:\Users\ARITRA\Desktop\Nilansublilling_software

============================================================
STEP 3 — Run the deploy. COPY/PASTE this line:
============================================================
powershell -ExecutionPolicy Bypass -File .\deploy_backend.ps1

============================================================
STEP 4 — It will ask: root@72.61.231.155's password:
============================================================
Type your VPS password and press Enter. (You will NOT see the characters
while typing — that is normal.)

It asks for the password a SECOND time a few seconds later.
Type it again and press Enter.

============================================================
STEP 5 — Wait 3-5 minutes. Watch the output.
============================================================
The script automatically does everything on the VPS:
  - installs Node.js 20 + PM2 (if missing)
  - creates database "npsoftwaredatabase" + user (keeps your existing data!)
  - generates a strong random DB password + JWT secret
  - closes PostgreSQL port 5432 to the internet (security fix)
  - adds /billing-api to your nilansupublication nginx site
  - npm install, prisma generate, prisma db push, build
  - writes the server .env file automatically
  - starts the API with PM2

============================================================
STEP 6 — You are DONE when you see:
============================================================
  DEPLOY SUCCESS - API healthy on port 5003
  DEPLOY COMPLETE

============================================================
STEP 7 — Verify in your browser. Open this URL:
============================================================
https://nilansupublication.com/billing-api/health

You must see:  {"status":"ok","ts":...}

============================================================
STEP 8 — Install the software on your PC. Run this installer:
============================================================
C:\Users\ARITRA\Desktop\Nilansublilling_software\nilanshu-billing-app\src-tauri\target\release\bundle\nsis\NilanshuBilling_0.1.0_x64-setup.exe

Open the app -> login with your admin account -> all data loads from the VPS.

============================================================
USEFUL COMMANDS (only if something goes wrong)
============================================================
Connect to the VPS:
ssh root@72.61.231.155

Check if the API is running:
pm2 status

See live logs/errors:
pm2 logs nilanshu-billing-api

Restart the API:
pm2 restart nilanshu-billing-api

Check bills in database:
sudo -u postgres psql -d npsoftwaredatabase -c 'SELECT type, COUNT(*) FROM "Bill" GROUP BY type;'

============================================================
TO DEPLOY AGAIN LATER (after code changes), on your PC:
============================================================
cd C:\Users\ARITRA\Desktop\Nilansublilling_software
powershell -ExecutionPolicy Bypass -File .\deploy_backend.ps1
(enter password 2 times — your data is never deleted)
