import { parsePlayback, audioLinks } from "./web/resolver.mjs";

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== "/api/resolve" && path !== "/api/download") return env.ASSETS.fetch(request);
    const origin = request.headers.get("Origin");
    const headers = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };
    if (origin && (origin === env.PAGES_ORIGIN || origin === new URL(request.url).origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else if (origin) {
      return new Response(null, { status: 403, headers });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const reply = (body, status = 200) => Response.json(body, { status, headers });
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    if (path === "/api/download") {
      try {
        const { url } = await request.json();
        const media = new URL(url);
        if (media.protocol !== "https:" || media.port || media.username || media.password ||
          !/^host[12]\.(media-rj\.com|rjmda-ircontent\.app|mediacon-rj\.app)$/i.test(media.hostname) ||
          !/^\/media\/(podcast|mp3)\/.+\.(mp3|m4a)$/i.test(media.pathname))
          return reply({ error: "Invalid media URL" }, 400);
        const file = await fetch(media, { redirect: "error" });
        const type = file.headers.get("Content-Type") || "";
        if (!file.ok || !/^(audio\/|application\/octet-stream)/i.test(type))
          return reply({ error: "Audio unavailable" }, 502);
        headers["Content-Type"] = type;
        const length = file.headers.get("Content-Length");
        if (length && !file.headers.has("Content-Encoding")) headers["Content-Length"] = length;
        return new Response(file.body, { headers });
      } catch { return reply({ error: "Audio unavailable" }, 502); }
    }
    let media;
    try {
      const { url } = await request.json();
      if (typeof url !== "string" || url.length > 2048) throw new Error("Invalid URL");
      media = parsePlayback(url);
      if (media.short && media.id === "1yJVNDy2" && media.kind === "podcast") media.id = "time-lapse-20";
      else if (media.short) {
        try {
          const redirect = await fetch(media.short, { redirect: "manual", signal: AbortSignal.timeout(5000) });
          const target = redirect.headers.get("Location");
          if (target) {
            const resolved = parsePlayback(new URL(target, media.short).href);
            if (!resolved.short && resolved.kind === media.kind) media = resolved;
          }
        } catch { /* The metadata endpoint can also accept some share IDs. */ }
      }
    } catch {
      return reply({ error: "Invalid playback URL" }, 400);
    }
    const upstream = new URL(`https://rj-deskcloud.com/api2/${media.kind}`);
    upstream.searchParams.set("id", media.id);
    try {
      const response = await fetch(upstream, {
        headers: { Accept: "application/json", "x-rj-user-agent": "Radio Javan/5.0.0 (Desktop) com.radioJavan.rj.desktop" },
        redirect: "error",
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return reply({ error: "Upstream unavailable" }, 502);
      const data = await response.json();
      return reply({ links: audioLinks(data), title: data?.song || data?.title, artist: data?.podcast_artist || data?.artist });
    } catch {
      return reply({ error: "Upstream unavailable" }, 502);
    }
  }
};
