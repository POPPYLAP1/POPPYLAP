# Poppylap Demo — Night City Arena

A responsive, static front-end demo for the Poppylap arcade tournament concept. It uses relative asset paths and has no build step, package install, or external font dependency.

## Run locally
1. Extract this ZIP.
2. Open `index.html` in a modern browser.

## Publish with GitHub Pages
1. Create a GitHub repository.
2. Upload the **contents** of this folder (`index.html`, `styles.css`, `app.js`, `games.js`, `assets/`, and this README) to the repository root. Do not upload only the ZIP file.
3. In the repository, open **Settings → Pages**. Under build/deployment, choose **Deploy from a branch**, select your main branch and the `/(root)` folder, then save.
4. Wait for GitHub Pages to publish and open the URL shown in Settings → Pages.

All links to scripts, styles, and artwork are relative, so the project can run from a GitHub Pages project URL. The site includes responsive layouts for desktop, laptop, tablet, and mobile screen widths.

## Included
- Live, upcoming, and completed tournament tabs; Live is selected by default when opening/returning to the Arena.
- Global leaderboard podium ordering for 1st, 2nd, and 3rd.
- One-second simulated ad preview before starting and retrying a run.
- Neon Flight and Mushroom Run game scripts.
- Poppylap logo, mark, favicon, and local city artwork.
- Player login demo with PayPal/UPI payout-contact fields.

## Performance and availability
The site is static and bundles its scripts and artwork locally, which avoids API/server round trips for the demo itself. GitHub Pages uses a CDN, but actual load time and availability can vary by location, device, browser, and network. No package can guarantee zero bugs or identical speed worldwide; test the published URL on the devices and networks you care about.

## Important prototype limitations
This is a front-end demo, not a production service. Accounts and passwords are not securely authenticated, tournament data and scores are not shared across devices, ads are simulated, and real prize payments are not provided. Do not enter real passwords or sensitive payout information. A real public launch requires a secure backend, authentication, server-side score validation, privacy/security review, and real ad/payment integrations.
