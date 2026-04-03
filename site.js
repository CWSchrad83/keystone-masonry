(() => {
  // ── GA4 CONFIGURATION ──
  // Replace with the live GA4 Measurement ID when ready.
  // The site works fine without it — all tracking silently no-ops until a real ID is set.
  const GA4_ID = "G-XXXXXXXXXX";
  const hasRealGaId = /^G-[A-Z0-9]{6,}$/i.test(GA4_ID) && !GA4_ID.includes("XXXXXXXXXX");

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  // ── HELPERS ──

  function sendEvent(name, params) {
    window.gtag("event", name, params || {});
  }

  function closestHref(el, prefix) {
    const link = el.closest("a[href]");
    if (!link) return null;
    const href = link.getAttribute("href") || "";
    return prefix ? (href.startsWith(prefix) ? link : null) : link;
  }

  // ── GA4 INIT ──

  function initAnalytics() {
    if (!hasRealGaId) return;

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(gaScript);

    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  // ── CLICK-TO-CALL TRACKING ──

  function bindPhoneTracking() {
    document.addEventListener("click", (e) => {
      const link = closestHref(e.target, "tel:");
      if (!link) return;

      const number = link.getAttribute("href").replace("tel:", "");
      const label = (link.textContent || "").trim().replace(/\s+/g, " ");

      sendEvent("phone_click", {
        event_category: "engagement",
        event_label: label || number,
        phone_number: number,
        link_location: link.closest("nav") ? "nav" :
                       link.closest(".mobile-call-bar") ? "mobile_bar" :
                       link.closest(".hero") ? "hero" :
                       link.closest("#contact") ? "contact" :
                       link.closest(".cta-section") ? "cta" :
                       link.closest("footer") ? "footer" : "page"
      });
    });
  }

  // ── OUTBOUND / EMAIL / MAPS CLICK TRACKING ──

  function bindOutboundTracking() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";

      // Email clicks
      if (href.startsWith("mailto:")) {
        sendEvent("email_click", {
          event_category: "engagement",
          event_label: href.replace("mailto:", "").split("?")[0]
        });
        return;
      }

      // Maps / iframe links (Google Maps)
      if (href.includes("google.com/maps") || href.includes("goo.gl/maps")) {
        sendEvent("maps_click", {
          event_category: "engagement",
          event_label: href
        });
        return;
      }

      // True outbound links (not tel:, not relative, not same domain)
      if (href.startsWith("http") && !href.includes(window.location.hostname)) {
        sendEvent("outbound_click", {
          event_category: "engagement",
          event_label: href,
          outbound: true
        });
      }
    });
  }

  // ── SCROLL DEPTH TRACKING (service pages only) ──

  function bindScrollDepth() {
    // Only track on pages with substantial content (service/project pages)
    const isServicePage = /chimney|driveway|projects/.test(window.location.pathname);
    if (!isServicePage) return;

    const thresholds = [25, 50, 75, 90];
    const fired = new Set();

    function checkScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      thresholds.forEach((t) => {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          sendEvent("scroll_depth", {
            event_category: "engagement",
            event_label: t + "%",
            percent_scrolled: t
          });
        }
      });
    }

    let scrollTimer;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(checkScroll, 150);
    }, { passive: true });
  }

  // ── GALLERY / LIGHTBOX TRACKING ──
  // Tracks clicks on photo cards and lightbox interactions.
  // If a lightbox is added in the future, hook it with:
  //   data-lightbox="open" on the trigger element
  //   data-lightbox="close" on the close button

  function bindGalleryTracking() {
    document.addEventListener("click", (e) => {
      // Photo card clicks (project galleries)
      const card = e.target.closest(".photo-card");
      if (card) {
        const img = card.querySelector("img");
        const label = card.querySelector(".photo-label");
        sendEvent("gallery_photo_click", {
          event_category: "gallery",
          event_label: (label ? label.textContent.trim() : "") ||
                       (img ? img.alt : "photo"),
          photo_src: img ? img.currentSrc || img.src : ""
        });
      }

      // Before/after phase badges
      const phase = e.target.closest(".photo-phase");
      if (phase) {
        sendEvent("gallery_phase_view", {
          event_category: "gallery",
          event_label: phase.textContent.trim()
        });
      }

      // Future lightbox hooks
      const lightboxTrigger = e.target.closest("[data-lightbox='open']");
      if (lightboxTrigger) {
        sendEvent("lightbox_open", {
          event_category: "gallery",
          event_label: lightboxTrigger.getAttribute("data-photo") || "photo"
        });
      }

      const lightboxClose = e.target.closest("[data-lightbox='close']");
      if (lightboxClose) {
        sendEvent("lightbox_close", { event_category: "gallery" });
      }
    });
  }

  // ── FAQ TOGGLE TRACKING ──

  function bindFaqTracking() {
    document.querySelectorAll("details summary").forEach((summary) => {
      summary.addEventListener("click", () => {
        const details = summary.closest("details");
        // details.open is the state BEFORE the click toggles it
        const action = details.open ? "faq_close" : "faq_open";
        sendEvent(action, {
          event_category: "engagement",
          event_label: summary.textContent.trim()
        });
      });
    });
  }

  // ── CONTACT FORM TRACKING ──
  // Works with the existing #quote-form.
  // Expected HTML: form#quote-form with inputs #qf-name, #qf-phone, #qf-message.
  // For a future dedicated form, use: form[data-track-form] with any inputs.

  function bindQuoteForm() {
    const form = document.getElementById("quote-form");
    if (!form) return;

    let formStarted = false;

    // form_start: first interaction with any field
    form.addEventListener("focusin", () => {
      if (formStarted) return;
      formStarted = true;
      sendEvent("form_start", {
        event_category: "engagement",
        event_label: "quote_form"
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#qf-name").value.trim();
      const phone = form.querySelector("#qf-phone").value.trim();
      const message = form.querySelector("#qf-message").value.trim();

      // GA4 events
      sendEvent("form_submit", {
        event_category: "engagement",
        event_label: "quote_form"
      });
      sendEvent("generate_lead", {
        event_category: "engagement",
        event_label: name
      });

      // Open email client with pre-filled message
      const subject = encodeURIComponent("Estimate request from " + name);
      const body = encodeURIComponent(
        "Name: " + name +
        "\nPhone: " + (phone || "Not provided") +
        "\n\n" + message
      );
      window.location.href = "mailto:don@stonemasonryny.com?subject=" + subject + "&body=" + body;

      form.innerHTML = '<p class="quote-form-success">Message ready to send — your email app should open now.</p>';
    });
  }

  // ── CURRENT YEAR ──

  function setCurrentYear() {
    document.querySelectorAll("#current-year").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  // ── INIT ──

  document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    initAnalytics();
    bindPhoneTracking();
    bindOutboundTracking();
    bindScrollDepth();
    bindGalleryTracking();
    bindFaqTracking();
    bindQuoteForm();
  });
})();
