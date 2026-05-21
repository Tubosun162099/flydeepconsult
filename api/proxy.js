export default async function handler(req, res) {
  try {
    const path = req.url.replace(/^\/api\/proxy/, "") || "/";
    const target = `https://tecnoverse.framer.website${path}`;

    const framerRes = await fetch(target, {
      headers: { "User-Agent": req.headers["user-agent"] || "Vercel-Proxy" }
    });

    const contentType = framerRes.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let body = await framerRes.text();

      // Remove static "Made with Framer" references
      body = body.replace(/Made with Framer/gi, "");
      body = body.replace(/<a[^>]*href=["']https:\/\/framer\.com[^>]*>.*?<\/a>/gi, "");

      // Inject script to dynamically remove Framer badge
      const removerScript = `
        <script>
          function removeFramerBadge() {
            const candidates = document.querySelectorAll('a[href*="framer.com"], [data-framer-name], [class*="framer"]');
            candidates.forEach(el => {
              if (el.innerText && el.innerText.includes("Framer")) {
                el.remove();
              }
            });
          }
          // Run on load
          document.addEventListener("DOMContentLoaded", removeFramerBadge);
          // Keep watching in case it’s injected later
          const observer = new MutationObserver(removeFramerBadge);
          observer.observe(document.body, { childList: true, subtree: true });
        </script>
      `;

      body = body.replace("</body>", `${removerScript}</body>`);

      res.setHeader("content-type", contentType);
      res.status(framerRes.status).send(body);
      return;
    }

    const arrayBuffer = await framerRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ct = framerRes.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.status(framerRes.status).send(buffer);
  } catch (err) {
    res.status(500).send("Proxy error: " + String(err));
  }
}
