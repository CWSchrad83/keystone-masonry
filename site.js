(() => {
  // Replace this with the live GA4 Measurement ID when it's ready.
  const GA4_ID = "G-XXXXXXXXXX";
  const hasRealGaId = /^G-[A-Z0-9]{6,}$/i.test(GA4_ID) && !GA4_ID.includes("XXXXXXXXXX");

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  function initAnalytics() {
    if (!hasRealGaId) {
      return;
    }

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
    document.head.appendChild(gaScript);

    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  function bindPhoneTracking() {
    document.addEventListener("click", (event) => {
      const phoneLink = event.target.closest('a[href^="tel:"]');
      if (!phoneLink) {
        return;
      }

      const phoneNumber = phoneLink.getAttribute("href").replace("tel:", "");
      const linkText = (phoneLink.textContent || "").trim().replace(/\s+/g, " ");

      window.gtag("event", "phone_click", {
        event_category: "engagement",
        event_label: linkText || phoneNumber,
        phone_number: phoneNumber,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    });
  }

  function setCurrentYear() {
    document.querySelectorAll("#current-year").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function bindQuoteForm() {
    const form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#qf-name").value.trim();
      const phone = form.querySelector("#qf-phone").value.trim();
      const message = form.querySelector("#qf-message").value.trim();

      const subject = encodeURIComponent("Estimate request from " + name);
      const body = encodeURIComponent(
        "Name: " + name +
        "\nPhone: " + (phone || "Not provided") +
        "\n\n" + message
      );

      window.location.href = "mailto:don@stonemasonryny.com?subject=" + subject + "&body=" + body;

      window.gtag("event", "quote_form_submit", {
        event_category: "engagement",
        event_label: name
      });

      form.innerHTML = '<p class="quote-form-success">Message ready to send — your email app should open now.</p>';
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    initAnalytics();
    bindPhoneTracking();
    bindQuoteForm();
  });
})();
