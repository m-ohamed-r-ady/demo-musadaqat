# Musadaqat landing page

## Setup

1. Run `npm install`.
2. Copy the documented values from `.env.example` into `.env` and add your SMTP2GO SMTP user, password, verified sender, and destination address.
3. Keep `SMTP_DRY_RUN=true` while testing validation locally. Set it to `false` to test real SMTP2GO delivery.
4. Run `npm start` and open `http://localhost:3000`.

## Email delivery test

Submit the Contact Us form once with `SMTP_DRY_RUN=true` to verify client and server validation. Then set `SMTP_DRY_RUN=false`, restart the server, submit again, and confirm the message arrives at `CONTACT_TO`. SMTP failures return a safe, actionable message without exposing credentials or provider details.

Use `npm run check` for JavaScript syntax checks.

## Deploy to Vercel

This project uses Vercel's native Express support. The root `server.js` exports the Express application for Vercel while still starting a local HTTP server when you run `npm start`.

1. Push the project to GitHub, GitLab, or Bitbucket and import the repository in Vercel, or run `npx vercel` from the project root.
2. Keep the detected framework set to Express. No build command or output directory is required.
3. Add the variables from `.env.example` in **Project Settings > Environment Variables**. Set `SMTP_DRY_RUN=false` only when the SMTP credentials and verified sender are ready.
4. Deploy. Vercel serves `public/` through its CDN and routes application requests through the exported Express app.

For a production contact form, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `CONTACT_TO`. `CONTACT_DISPLAY_EMAIL` controls the email address displayed on the page.
