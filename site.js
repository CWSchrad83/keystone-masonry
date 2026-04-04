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
    if (!hasRealGaId) return;

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
    if (!hasRealGaId) return;

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
    if (!hasRealGaId) return;

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
    if (!hasRealGaId) return;

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

  function bindLightboxAccessibility() {
    const galleryRoot = document.getElementById("gallery-photos");
    if (!galleryRoot) return;

    let lastTrigger = null;

    function getActiveLightbox() {
      const hash = window.location.hash;
      if (!hash) return null;
      const target = document.querySelector(hash);
      return target && target.classList.contains("lightbox") ? target : null;
    }

    function focusForHashChange() {
      const active = getActiveLightbox();
      if (active) {
        const closeLink = active.querySelector(".lightbox__close");
        if (closeLink) {
          closeLink.focus();
        }
        return;
      }

      if (lastTrigger && document.contains(lastTrigger)) {
        lastTrigger.focus();
      }
    }

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest(".gallery-thumb[data-lightbox='open']");
      if (trigger) {
        lastTrigger = trigger;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const active = getActiveLightbox();
      if (!active) return;

      e.preventDefault();
      window.location.hash = "gallery-photos";
    });

    window.addEventListener("hashchange", () => {
      window.requestAnimationFrame(focusForHashChange);
    });
  }

  // ── FAQ TOGGLE TRACKING ──

  function bindFaqTracking() {
    if (!hasRealGaId) return;

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
  // Submission is handled by the form action so it still works without JS.

  function bindQuoteForm() {
    const form = document.getElementById("quote-form");
    if (!form) return;
    const submitButton = form.querySelector("button[type='submit']");
    const feedback = form.querySelector("#qf-feedback");
    const fields = Array.from(form.querySelectorAll("input, textarea"));

    let formStarted = false;
    let submitLockTimer = null;

    function setFeedback(message, state) {
      if (!feedback) return;
      feedback.textContent = message || "";
      if (state) {
        feedback.setAttribute("data-state", state);
      } else {
        feedback.removeAttribute("data-state");
      }
    }

    function setFieldValidity(field) {
      if (!field) return;

      field.setCustomValidity("");

      if (field.validity.valueMissing) {
        if (field.id === "qf-name") {
          field.setCustomValidity("Please enter your name so Don knows who to reply to.");
        } else if (field.id === "qf-message") {
          field.setCustomValidity("Please add a short description of the repair or project.");
        }
      }

      field.setAttribute("aria-invalid", field.checkValidity() ? "false" : "true");
    }

    function lockSubmit() {
      if (!submitButton) return;
      submitButton.disabled = true;
      submitButton.textContent = "Opening Email App...";
      form.setAttribute("aria-busy", "true");

      window.clearTimeout(submitLockTimer);
      submitLockTimer = window.setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
        form.removeAttribute("aria-busy");
      }, 4000);
    }

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        setFieldValidity(field);
        setFeedback("");
      });
    });

    form.addEventListener("invalid", (e) => {
      const field = e.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;

      setFieldValidity(field);
      setFeedback("Please fix the highlighted field and try again.", "error");
      if (!hasRealGaId) return;
      sendEvent("form_submit_invalid", {
        event_category: "engagement",
        event_label: field.name || field.id || "quote_form"
      });
    }, true);

    // form_start: first interaction with any field
    form.addEventListener("focusin", () => {
      if (formStarted) return;
      formStarted = true;
      if (!hasRealGaId) return;
      sendEvent("form_start", {
        event_category: "engagement",
        event_label: "quote_form"
      });
    });

    form.addEventListener("submit", () => {
      const name = form.querySelector("#qf-name").value.trim();

      if (hasRealGaId) {
        // GA4 events
        sendEvent("form_submit", {
          event_category: "engagement",
          event_label: "quote_form"
        });
        sendEvent("generate_lead", {
          event_category: "engagement",
          event_label: name
        });
        sendEvent("form_mailto_handoff", {
          event_category: "engagement",
          event_label: "quote_form"
        });
      }

      setFeedback("Your email app should open with the message filled in. If it does not, call 585-490-1600 or email don@stonemasonryny.com.", "info");
      lockSubmit();
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
    bindLightboxAccessibility();
    bindFaqTracking();
    bindQuoteForm();
  });
})();
