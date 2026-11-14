import { parsePlayback, selectQuality } from "./resolver.mjs";

// For GitHub Pages, set this to the deployed Worker's full /api/resolve URL.
const endpoint = document.querySelector('meta[name="resolver-url"]')?.content;
const get = id => document.getElementById(id);
const input = get("input");
const quality = get("quality");
const status = get("status");
const output = get("output");
const result = get("result");
let links = [];
let title, artist;

function showSelection() {
  const selected = selectQuality(links, quality.value);
  output.value = selected?.url ?? "";
  result.hidden = !selected;
  const high = links.find(url => /\/(aac|mp3)-256\//i.test(new URL(url).pathname));
  get("high").value = high || "";
  get("recommended").hidden = !high || high === selected?.url;
  result.hidden = !selected && !high;
  get("download").disabled = get("copy").disabled = !selected;
  status.textContent = selected?.generated
    ? "آدرس ۲۵۶ ساخته شد. وجود فایل و دسترسی به آن تأیید نشده."
    : selected ? "لینک فایل پیدا شد." : "لینک این کیفیت در اطلاعات دریافتی موجود نیست.";
}

quality.addEventListener("change", () => { if (links.length) showSelection(); });
get("lookup").addEventListener("submit", async event => {
  event.preventDefault();
  links = [];
  result.hidden = true;
  try { parsePlayback(input.value.trim()); }
  catch { status.textContent = "لینک پخش یک آهنگ یا پادکست رادیو جوان را وارد کن."; return; }
  if (!endpoint && location.hostname.endsWith(".github.io")) {
    status.textContent = "سرویس دریافت لینک هنوز به این صفحه متصل نشده است.";
    return;
  }
  get("find").disabled = true;
  status.textContent = "در حال دریافت لینک…";
  try {
    const response = await fetch(endpoint || "/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.value.trim() })
    });
    if (!response.ok) throw new Error("Lookup failed");
    ({ links, title, artist } = await response.json());
    showSelection();
  } catch {
    status.textContent = "سرویس دریافت لینک پاسخ نداد. دوباره امتحان کن.";
  } finally {
    get("find").disabled = false;
  }
});

async function download(url) {
  const buttons = [get("download"), get("download-high"), get("find"), quality];
  buttons.forEach(button => { button.disabled = true; });
  status.textContent = "در حال اتصال…";
  try {
    const response = await fetch(new URL("/api/download", endpoint || location.href), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (!response.ok || !response.body) throw new Error("Download unavailable");
    const total = Number(response.headers.get("Content-Length"));
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    const maxBytes = 128 * 1024 * 1024;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) { await reader.cancel(); throw new Error("File too large"); }
      chunks.push(value);
      status.textContent = total > 0
        ? `در حال دانلود… ${Math.min(99, Math.floor(received * 100 / total))}٪`
        : `دریافت‌شده: ${(received / 1048576).toFixed(1)} مگابایت`;
    }
    if (!received || (total > 0 && received !== total)) throw new Error("Incomplete download");
    const path = new URL(url).pathname;
    const extension = path.match(/\.(mp3|m4a)$/i)[0];
    const name = (title ? [artist, title].filter(Boolean).join(" - ") : path.split("/").pop().slice(0, -extension.length))
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().slice(0, 140);
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(new Blob(chunks, { type: response.headers.get("Content-Type") }));
    link.href = objectUrl;
    link.download = (name || "Radio Javan") + extension;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    status.textContent = "۱۰۰٪ · فایل به مرورگر تحویل داده شد.";
  } catch {
    status.textContent = "دانلود انجام نشد. می‌توانی لینک مستقیم را جداگانه باز کنی.";
  } finally {
    buttons.forEach(button => { button.disabled = false; });
    get("download").disabled = !output.value;
  }
}

get("download").addEventListener("click", () => download(output.value));
get("download-high").addEventListener("click", () => download(get("high").value));

function bindCopy(button, field) {
  get(button).addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(field.value); status.textContent = "لینک کپی شد."; }
    catch { field.select(); status.textContent = "آدرس را دستی کپی کن."; }
  });
}
bindCopy("copy", output);
bindCopy("copy-high", get("high"));
