const playHosts = new Set(["play.radiojavan.com", "www.radiojavan.com", "radiojavan.com"]);

export function parsePlayback(value) {
  const url = new URL(value);
  if (url.origin === "https://rj.app" && !url.username && !url.password) {
    const short = /^\/(p|m)\/([\w-]+)\/?$/.exec(url.pathname);
    if (short) return { kind: short[1] === "p" ? "podcast" : "mp3", id: short[2], short: url.href };
  }
  if (url.protocol !== "https:" || !playHosts.has(url.hostname) || url.username || url.password || url.port) throw new Error("Invalid Radio Javan URL");
  const match = /^\/(podcast|song|mp3)\/(?:permlink\/)?([^/]+)\/?$/.exec(url.pathname);
  if (!match) throw new Error("Invalid playback path");
  return { kind: match[1] === "podcast" ? "podcast" : "mp3", id: decodeURIComponent(match[2]) };
}

export function audioLinks(data) {
  if (!data || data.success === false) return [];
  return [...new Set([data.link, data.hq_link, data.lq_link].filter(value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && /\.(mp3|m4a)$/i.test(url.pathname);
    } catch {
      return false;
    }
  }))];
}

export function selectQuality(links, quality) {
  const matches = (item, rate) => new RegExp(`/(aac|mp3)-${rate}/`, "i").test(new URL(item).pathname);
  const exact = quality === "default" ? links[0] : links.find(item => matches(item, quality));
  if (exact) return { url: exact, generated: false };
  const base = quality === "256" && links.find(item => matches(item, "128"));
  if (!base) return null;
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/(aac|mp3)-128\//i, "/$1-256/");
  return { url: url.href, generated: true };
}
