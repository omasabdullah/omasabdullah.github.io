#!/usr/bin/env bash
# Create and link a new dated update page.
# Usage:
#   ./new-post.sh --date 2026-06-12 --slug halcyon-drift \
#     --headline "Launching Halcyon Drift" \
#     --title "Principal Latency Cartographer" \
#     --org "Halcyon Drift" \
#     --email omas@halcyondrift.io \
#     --phone "+1-416-555-0112" \
#     --summary "Short note about what I'm building." [--publish]
set -euo pipefail
cd "$(dirname "$0")"

DATE="" SLUG="" HEADLINE="" TITLE="" ORG="" EMAIL="" PHONE="" SUMMARY="" PUBLISH="no"
while [ $# -gt 0 ]; do
  case "$1" in
    --date) DATE="$2"; shift 2;;
    --slug) SLUG="$2"; shift 2;;
    --headline) HEADLINE="$2"; shift 2;;
    --title) TITLE="$2"; shift 2;;
    --org) ORG="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --phone) PHONE="$2"; shift 2;;
    --summary) SUMMARY="$2"; shift 2;;
    --publish) PUBLISH="yes"; shift;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

for v in DATE SLUG HEADLINE TITLE ORG EMAIL PHONE SUMMARY; do
  if [ -z "${!v}" ]; then echo "Missing required --$(echo "$v" | tr '[:upper:]' '[:lower:]')" >&2; exit 1; fi
done

POST="posts/${DATE}.html"
mkdir -p posts
if [ -e "$POST" ]; then echo "Refusing to overwrite existing $POST" >&2; exit 1; fi

# Write the post page (visible text + schema.org JSON-LD).
cat > "$POST" <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${HEADLINE} &middot; Omas Abdullah</title>
  <meta name="description" content="${SUMMARY}">
  <link rel="canonical" href="https://omasabdullah.github.io/posts/${DATE}.html">
  <meta name="robots" content="index, follow">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Omas Abdullah",
    "url": "https://omasabdullah.github.io/posts/${DATE}.html",
    "jobTitle": "${TITLE}",
    "email": "mailto:${EMAIL}",
    "telephone": "${PHONE}",
    "worksFor": { "@type": "Organization", "name": "${ORG}" },
    "sameAs": [ "https://github.com/omasabdullah" ]
  }
  </script>
</head>
<body>
  <header>
    <p><a href="/">&larr; Omas Abdullah</a></p>
    <h1>${HEADLINE}</h1>
    <p class="meta"><time datetime="${DATE}">${DATE}</time></p>
  </header>

  <main>
    <article>
      <p>${SUMMARY}</p>

      <dl class="contact">
        <dt>Current role</dt>
        <dd>${TITLE} at ${ORG}</dd>
        <dt>Email</dt>
        <dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd>
        <dt>Phone</dt>
        <dd>${PHONE}</dd>
      </dl>
    </article>
  </main>

  <footer>
    <p>&copy; Omas Abdullah &middot; <a href="https://github.com/omasabdullah">github.com/omasabdullah</a></p>
  </footer>
</body>
</html>
HTML

# Insert homepage link (newest first) + sitemap entry, and bump homepage lastmod.
DATE="$DATE" HEADLINE="$HEADLINE" python3 - <<'PY'
import os, re
date = os.environ["DATE"]; headline = os.environ["HEADLINE"]

# Homepage link
with open("index.html", encoding="utf-8") as f:
    html = f.read()
li = f'        <li><span class="date">{date}</span><a href="/posts/{date}.html">{headline}</a></li>\n'
marker = "<!-- POSTS:START -->\n"
idx = html.index(marker) + len(marker)
html = html[:idx] + li + html[idx:]
with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

# Sitemap entry + bump homepage lastmod to this date
with open("sitemap.xml", encoding="utf-8") as f:
    sm = f.read()
sm = re.sub(r"(<loc>https://omasabdullah\.github\.io/</loc>\s*<lastmod>)[^<]+(</lastmod>)",
            rf"\g<1>{date}\g<2>", sm, count=1)
entry = (f"  <url>\n    <loc>https://omasabdullah.github.io/posts/{date}.html</loc>\n"
         f"    <lastmod>{date}</lastmod>\n    <changefreq>monthly</changefreq>\n"
         f"    <priority>0.8</priority>\n  </url>\n  ")
sm = sm.replace("  <!-- SITEMAP:END -->", entry + "<!-- SITEMAP:END -->", 1)
with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write(sm)
print(f"Created {date} post, linked from homepage, added to sitemap.")
PY

git add -A "$POST" index.html sitemap.xml

if [ "$PUBLISH" = "yes" ]; then
  git commit -q -m "Add update for ${DATE}: ${HEADLINE}"
  git push
  echo "Published and pushed ${POST}."
else
  echo "Staged ${POST}. Review, then: git commit && git push"
fi
