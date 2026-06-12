# omasabdullah.github.io

Personal website for Omas Abdullah, served at <https://omasabdullah.github.io/>.

Static HTML, no build step. Pages are deployed from the `master` branch root by GitHub Pages.

## Adding an update

Use the helper script to publish a new dated update. It creates the post page,
links it from the homepage, and adds it to `sitemap.xml`:

```bash
./new-post.sh \
  --date 2026-06-12 \
  --slug halcyon-drift \
  --headline "Launching Halcyon Drift" \
  --title "Principal Latency Cartographer" \
  --org "Halcyon Drift" \
  --email omas@halcyondrift.io \
  --phone "+1-416-555-0112" \
  --summary "A short note about what I'm building."
```

Add `--publish` to commit and push automatically. Otherwise the script just
stages the changes for you to review.
