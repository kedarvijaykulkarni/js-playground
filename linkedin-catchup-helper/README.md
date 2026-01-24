# LinkedIn Catch-up Helper (Human-in-the-loop)

This Chrome Extension helps you prepare messages on LinkedIn "My Network → Catch up" pages:
- Birthdays: /mynetwork/catch-up/birthday/
- Work anniversaries: /mynetwork/catch-up/work_anniversaries/
- Job changes: /mynetwork/catch-up/job_changes/

✅ It can open the message overlay and fill a message draft.
✅ It highlights the Send button.
❌ It does NOT auto-send (you must click Send).

## Install (unpacked)
1. Save this folder somewhere (e.g. linkedin-catchup-helper/).
2. Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder.

## Use
1. Log into LinkedIn normally.
2. Open a catch-up page (birthday/work_anniversaries/job_changes).
3. Click the extension icon.
4. Click "Prepare ..." to step through cards.
5. Review the drafted message and click **Send** manually.

## Settings
Open the extension "Settings" link in the popup (or Chrome extensions → details → Extension options).

## Notes
- LinkedIn UI changes often. If the editor or button selectors stop working,
  update selectors in `contentScript.js`.
