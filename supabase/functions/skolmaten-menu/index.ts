const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const res = await fetch("https://skolmaten.se/sven-eriksonsgymnasiet", {
      headers: { Accept: "application/rss+xml" },
    });

    const xml = await res.text();
    const items: { title: string; description: string; date: string | null }[] =
      [];

    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = match[1];
      const title =
        block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
      const description =
        block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ??
        "";
      const pubDate =
        block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";

      if (!description || description === "Ingen meny för idag") continue;

      const d = new Date(pubDate);
      const date = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
      items.push({ title, description, date });
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
