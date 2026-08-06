# How to send an update to your customers

Whenever you finish adding new features and want your customers to receive the update, follow these exact steps:

**Step 1:** Open PowerShell, navigate to your app folder:
```powershell
cd C:\Users\ARITRA\Desktop\Nilansublilling_software\nilanshu-billing-app
```

**Step 2:** Tell PowerShell your secret key by typing:
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
```
*(replace `YOUR_PRIVATE_KEY_HERE` with the actual key you saved)* and press Enter.

**Step 3:** Open `tauri.conf.json`, find `"version": "0.0.X"`, and change it to your new version number (e.g., `"0.0.3"`). Save the file.

**Step 4:** Build the update by typing this in PowerShell and pressing Enter:
```powershell
npm run tauri build
```
It will take a few minutes to create the new `.exe` installer.

**Step 5:** Because your secret key has a password, you must sign the file manually. After the build finishes, run this exact command, but MAKE SURE to change `0.0.2` to your actual new version number at the very end of the command:
```powershell
npx tauri signer sign -k "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YzNVdVBMUGl1K0tNQWVnNk81ZXp0QVMyalNPT2lFSjNHNWhraWZDa1VLd0FBQkFBQUFBQUFBQUFBQUlBQUFBQVF3aHBLYytrM2hSblB3OVRCRUEvVDdIZkkwT3ptam1HWWRrOUtFNGhqNmhWSjNyRzN2RnRucDRWOWNtdG1wcnVncmdWc0hjMEM4OE1ua2ZiOXpoK0tpY1d4TXVZZ2I4MVV4dFp4NTVTNmtWOFhIWWkvU3JWcEc3aVFMY1l0c3hwZVRla1Exb1BYQ3c9Cg==" "C:\Users\ARITRA\Desktop\Nilansublilling_software\nilanshu-billing-app\src-tauri\target\release\bundle\nsis\NP-Billing_YOUR_NEW_VERSION_HERE_x64-setup.exe"
```
*(Press Enter when it asks for the password, or type your password if you set one.)*

**Step 6:** When it finishes, go to the folder `src-tauri/target/release/bundle/nsis/`. You will see two files:
- Your `.exe` installer file.
- A `.sig` file. *(Open the .sig file in Notepad and copy the signature text. Keep this handy.)*

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
