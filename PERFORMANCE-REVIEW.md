# Website performance review — 20 October 2026

Site: https://lamin-clinic.vercel.app/

Reviewed the public feed, article reader, sign-in, Dashboard/ledger, reports, settings/backup, publishing/media preparation, data access, production bundles, and PWA configuration. Public pages were checked live; protected pages were reviewed in code and exercised by the existing local test suite. No production staff login or patient-data requests were made.

## Live measurements before these changes

Read-only HTTP measurements at approximately 23:16 Myanmar time, on this machine's connection:

| Request | Total response time | Decoded bytes | Cache policy |
| --- | ---: | ---: | --- |
| Home HTML | 226 ms | 1,026 | Revalidate |
| Entry JavaScript | 191 ms | 374,282 | Revalidate |
| Sign-in HTML | 58 ms | 1,026 | Revalidate |
| Public feed | 220 ms | 3,046 | No store |
| Feed statistics | 240 ms | 24 | No store |
| Public photo | 354 ms | 202,124 | No store |
| Public feed, repeated | 468 ms | 3,046 | No store |

A separate initial home request took 582 ms. These are small samples of HTTP timing, not browser rendering times, Core Web Vitals, a load test, or evidence of performance across Myanmar mobile networks. Feed responses contained three posts during this check. The public feed and sign-in page rendered successfully in the browser.

## Changes made locally

1. **Load page code when needed.** Reports, settings, ledger, publishing, article reader, and sign-in previously shipped together in the entry bundle. Those screens now load separately, with a loading fallback. In comparable local production builds, the initial application JavaScript plus its static shared dependencies decreased from about 373 KB to 306 KB (18%). Gzip decreased from about 114 KB to 100 KB. The cloud SDK is an additional, unchanged dependency of approximately 215 KB / 55 KB gzip; these figures exclude it and exclude background PWA installation traffic.
2. **Reuse Dashboard data while navigating days.** Changing days no longer remounts the weekly/monthly summary. An unchanged query range reuses its loaded data. Changing the range still fetches the required records, and saving/deleting a visit still refreshes totals.
3. **Remove the final empty visit query.** The first page requests a total count, allowing pagination to finish after the last populated page. Later pages omit the count. This works with server page limits smaller than the requested 500 rows; when no count is supplied, the original empty-page fallback remains. Counts add database work, so compare large exports after deployment if the record volume grows substantially.
4. **Bound stalled response bodies.** Previously, the API timer ended as soon as response headers arrived. JSON is now fully received within the existing deadline, so stalled JSON cannot leave data screens waiting indefinitely. Media stays streamed, uploads retain their longer deadline, and HTTP error statuses and JSON errors remain available to callers.
5. **Cache public media and versioned assets.** Configuration now allows one hour of browser caching for public article media, and one year for content-hashed `/assets/` files. Private API responses and uploads remain uncached. Public media CDN caching remains disabled. Public files can remain in a visitor's browser cache for up to one hour after removal. HTML and the service worker do not receive immutable caching. See [Vercel header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers) and [cache-control documentation](https://vercel.com/docs/caching/cache-control-headers).
6. **Reduce repeated rendering work.** Ledger queue numbers use a precomputed map instead of scanning the entire visit array for every row. Feed cards reuse number/date formatters instead of constructing new internationalization objects on each render.

## Remaining limits and future scaling work

- Dashboard and reports still download full matching visit records and aggregate on the device. Recent-name suggestions read up to 90 days of visits. Server-side summary and suggestion endpoints would reduce transferred patient data for larger clinics; this would require a separate database migration and permission checks.
- The public feed already uses pagination, short excerpts, and debounced search. Videos do not preload on the public reader. Photos are resized before upload, but feed covers still use the full uploaded image; small thumbnails could reduce first-visit downloads further. The first photo is also lazy-loaded, which warrants an actual mobile rendering trace before tuning loading priority.
- Local mode stores the complete ledger in localStorage and parses it on reads. Large backups and restores also run on the main thread. Consider IndexedDB/workers if measured clinic datasets cause noticeable pauses; no large private dataset was used in this audit.
- The PWA still precaches about 937 KB of app/font assets in the background to preserve offline availability. Lazy routes reduce initial execution and entry downloads, not total offline installation size. Transparent/blurred surfaces also need profiling on a lower-powered phone before attributing scrolling delays to them.
- No production staff sign-in, publication, backup/restore, video-upload, authenticated load test, Lighthouse run, or mobile Core Web Vitals measurement was performed. Those operations were reviewed in source and available automated checks. Production latency after deploying these changes remains unmeasured.

## Validation and rollout

Automated regression coverage includes stalled JSON bodies, preserved errors/media streaming, capped pagination without an extra empty page, unchanged Dashboard-range reuse, and cache rules that exclude private API data. Run `npm test`, `npm run lint`, and `npm run build`.

Repeat the public HTTP audit with `node scripts/audit-performance.mjs https://lamin-clinic.vercel.app/`. It reads the public anonymous key from the environment or local `.env`, never prints it, never signs in, and makes no patient-data or write requests. Reported body sizes are decoded sizes, not compressed transfer sizes.

All fixes are local. Deploy them before checking the new cache headers and loading behavior on the live site. Then test staff workflows and performance on the actual Wi-Fi/mobile connections where delays occur.
