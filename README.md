# Seventh Axis

**The missing axis is understanding.**

Seventh Axis is software that turns plain instructions in English, Bahasa Malaysia or 中文 into verified programs for the robot arm a factory already has. We don't sell robots. Describe the task, watch it run in a digital twin, then export controller code for the arm on your line.

The robotics company of Kuala Lumpur. Live at [seventh-axis.vercel.app](https://seventh-axis.vercel.app).

## What's here

This repository is the marketing website. The product, Kata (the Studio, the app, the planner API and the robot bridge), lives in [seventhaxisrobots/kata](https://github.com/seventhaxisrobots/kata) and is served at https://kata-seventh-axis.vercel.app. `/studio` and `/app` here redirect there.

| Path | What it is |
| --- | --- |
| `index.html`, `src/home/` | Home: Kuala Lumpur at dusk, the intro animation and the 3D cobot that builds the headline |
| `partials/film.html`, `src/home/film.ts`, `src/home/globe.ts` | The launch film with a WebGL Earth (paused; add `?film` to the URL to play it) |
| `product.html`, `industries.html`, `pricing.html`, `pilot.html`, `safety.html` | Product, industries, pricing, the pilot waitlist and safety |
| `about.html`, `src/investors/` | About and investors: the story, the founder and the business plan, with six scroll-driven 3D scenes |
| `roi.html`, `src/roi/` | ROI calculator with Malaysian wages, levies and the Smart Automation Grant |
| `book.html` | Book a meeting |
| `privacy.html`, `cookies.html`, `terms.html` | Privacy notice (English and BM, PDPA 2010), cookie policy, terms of use |
| `api/ask.ts` | Ask Axis, the site's assistant, using Gemini |
| `api/waitlist.ts`, `api/book.ts` | Pilot sign-ups and meeting requests in Upstash Redis |
| `src/robot/` | A copy of the Studio's UR10e model and kinematics, for the 3D scenes |
| `src/site/`, `partials/` | Shared header, footer, cookie consent and form handling |

## Run it locally

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY
npm run dev
```

Without a Gemini key, Ask Axis answers from its built-in knowledge only. Without Redis, sign-ups and meeting requests are written to `.waitlist-dev.jsonl` and `.bookings-dev.jsonl`.

```bash
npm test          # ROI model checks
npm run build     # type-check and production build
```

## Deploy to Vercel

1. Import this repository at [vercel.com/new](https://vercel.com/new). The defaults are right: Vite, `npm run build`, output `dist`.
2. In **Settings → Environment Variables** add `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey).
3. In **Storage**, add **Upstash for Redis** from the Marketplace and connect it to the project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
4. Optional: enable **Web Analytics** in the project and set `VITE_ANALYTICS=vercel`. It only loads for visitors who accept analytics.
5. Optional: set `VITE_BOOKING_URL` to a Cal.com or Calendly link to offer instant scheduling on `/book`.
6. Redeploy.

Export sign-ups and meeting requests to CSV at any time:

```bash
npx vercel env pull .env.local
npm run waitlist:export
```

## Before a public launch

- [ ] Replace the placeholder contact email and company details in `src/site/config.ts`.
- [ ] Have the privacy notice and terms reviewed by a Malaysian lawyer, and register the company with SSM.
- [ ] Move the Gemini key to a paid tier if you don't want Google to use Ask Axis prompts to improve its models.
- [ ] Verify the site in Google Search Console and Bing Webmaster Tools, then submit https://seventh-axis.vercel.app/sitemap.xml.
- [ ] Check pricing and the FAQ in `src/shared/knowledge.ts`, and the subscription price in `src/roi/model.ts` (placeholders).
- [ ] Check the Petronas Twin Towers photo (`kl-night`) isn't used in paid advertising without permission from KLCC.

## Credits

Photography from [Unsplash](https://unsplash.com) by Mathew Schwartz, Meriç Dağlı, Mohd Jon Ramlan, Irfan Syahmi, Job Savelsberg, Simon Kadula, Homa Appliances, ThisisEngineering and Sufyan. Earth imagery from [NASA Earth Observatory](https://earthobservatory.nasa.gov) (Blue Marble, Black Marble). Robot model: UR10e meshes from [Universal Robots](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) (BSD-3-Clause, see `public/models/LICENSES.txt`). Typefaces: Barlow and Barlow Semi Condensed by Jeremy Tribby (SIL Open Font License).
