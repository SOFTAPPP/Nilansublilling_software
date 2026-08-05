# How to send an update to your customers

Whenever you finish adding new features and want your customers to receive the update, follow these exact steps:

**Step 1:** Open PowerShell, navigate to your app folder:
```powershell
cd C:\Users\ARITRA\Desktop\Nilansublilling_software\nilanshu-billing-app
```

**Step 2:** Tell PowerShell your secret key by typing:
```powershell
$env:TAURI_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
```
*(replace `YOUR_PRIVATE_KEY_HERE` with the actual key you saved)* and press Enter.

**Step 3:** Open `tauri.conf.json`, find `"version": "0.0.1"`, and change it to `"0.0.2"` (or whatever the next number is). Save the file.

**Step 4:** Type the following command in PowerShell and press Enter:
```powershell
npm run tauri build
```
It will take a few minutes to create the new `.msi` installer.

**Step 5:** When it finishes, go to the folder `src-tauri/target/release/bundle/msi/`. You will see two files:
- Your `.msi` installer file.
- A `.sig` file. *(If you open the .sig file in Notepad, you will see a signature code. Keep this handy.)*

**Step 6:** Go to your GitHub page (`SOFTAPPP/Nilansublilling_software`). Click on **Releases** on the right side and create a new Release called `v0.0.2`. Upload your `.msi` file there and publish it.

**Step 7:** Finally, in your GitHub repository's main files, create a new file named `latest.json` (or edit it if it exists), and paste this exact text into it:

```json
{
  "version": "0.0.2",
  "notes": "Bug fixes and new features",
  "pub_date": "2026-08-06T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "PASTE_THE_TEXT_FROM_THE_.SIG_FILE_HERE",
      "url": "https://github.com/SOFTAPPP/Nilansublilling_software/releases/download/v0.0.2/NP-Billing_0.0.2_x64_en-US.msi"
    }
  }
}
```
*(Make sure to change the version, signature, and URL to match your new update)*

**Step 8:** Click "Commit changes" on GitHub to save the `latest.json` file.

🚀 **Boom!** The exact second you save that `latest.json` file on GitHub, all of your customers' software will instantly detect it, download it, and restart!
