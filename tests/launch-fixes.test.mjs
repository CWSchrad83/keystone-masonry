import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const siteJs = fs.readFileSync(path.join(root, "site.js"), "utf8");

test("quote form has a non-JS submission path", () => {
  assert.match(
    indexHtml,
    /<form class="quote-form" id="quote-form" aria-label="Request a free estimate" action="mailto:don@stonemasonryny\.com" method="post" enctype="text\/plain">/
  );
  assert.match(indexHtml, /<p class="quote-form-help" id="qf-help">/);
  assert.match(indexHtml, /id="qf-phone" name="phone" autocomplete="tel" inputmode="tel"/);
  assert.match(indexHtml, /id="qf-feedback" role="status" aria-live="polite"/);
  assert.match(
    indexHtml,
    /<p class="email-note">Submitting opens your email app with the message filled in so you can review it before sending\.<\/p>/
  );
});

test("quote form JS no longer blocks submission or shows a false success state", () => {
  assert.doesNotMatch(siteJs, /form\.innerHTML\s*=/);
  assert.doesNotMatch(siteJs, /window\.location\.href = "mailto:/);
  assert.match(siteJs, /form\.addEventListener\("submit", \(\) => \{/);
  assert.doesNotMatch(siteJs, /form\.addEventListener\("submit", \(e\) => \{/);
  assert.match(siteJs, /sendEvent\("form_submit_invalid"/);
  assert.match(siteJs, /sendEvent\("form_mailto_handoff"/);
  assert.match(siteJs, /submitButton\.disabled = true/);
});

test("lightbox markup no longer claims inaccessible modal behavior", () => {
  assert.doesNotMatch(indexHtml, /class="lightbox" role="dialog"/);
  assert.doesNotMatch(indexHtml, /class="lightbox"[^>]*aria-modal="true"/);
  assert.doesNotMatch(indexHtml, /class="lightbox__close" role="button"/);
  assert.match(indexHtml, /<div id="lb-fw" class="lightbox">/);
});

test("accessibility helpers include skip link and lightbox keyboard hooks", () => {
  assert.match(indexHtml, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
  assert.match(indexHtml, /<main id="main-content">/);
  assert.match(indexHtml, /data-lightbox="open"/);
  assert.match(indexHtml, /data-lightbox="close"/);
  assert.match(siteJs, /function bindLightboxAccessibility\(\)/);
  assert.match(siteJs, /if \(e\.key !== "Escape"\) return;/);
});

test("homepage preloads the lighter hero logo and includes intrinsic hero image sizes", () => {
  assert.match(indexHtml, /<link rel="preload" as="image" href="images\/base-logo\.png" type="image\/png" \/>/);
  assert.doesNotMatch(indexHtml, /<link rel="preload" as="image" href="images\/front-walkway\.webp"/);
  assert.match(indexHtml, /<img class="hero__logo" src="images\/base-logo\.png"[^>]*fetchpriority="high"[^>]*decoding="async"/);
  assert.match(indexHtml, /<img\s+src="images\/front-walkway\.jpg"[\s\S]*width="1200"[\s\S]*height="1600"/);
  assert.match(indexHtml, /<img\s+src="images\/chimney-rebuild\.jpg"[\s\S]*width="1200"[\s\S]*height="676"/);
});

test("analytics-only listeners are skipped when GA is not configured", () => {
  assert.match(siteJs, /function bindPhoneTracking\(\) \{\s+if \(!hasRealGaId\) return;/);
  assert.match(siteJs, /function bindOutboundTracking\(\) \{\s+if \(!hasRealGaId\) return;/);
  assert.match(siteJs, /function bindScrollDepth\(\) \{\s+if \(!hasRealGaId\) return;/);
  assert.match(siteJs, /function bindGalleryTracking\(\) \{\s+if \(!hasRealGaId\) return;/);
  assert.match(siteJs, /function bindFaqTracking\(\) \{\s+if \(!hasRealGaId\) return;/);
});
