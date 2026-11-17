# claude-seo (copie locale)

Copie des consignes du skill open source [claude-seo](https://github.com/AgriciDaniel/claude-seo) (licence MIT, voir `LICENSE`), commit `468ed5b` du 17 novembre 2026. Seuls les fichiers de consignes (`skills/`, `agents/`) sont gardés, sans les scripts.

Utilisée par les tâches planifiées SEO du Sachoir, qui la lisent directement dans ce dépôt au lieu de réinstaller le skill.

- Dans les fichiers, `${CLAUDE_PLUGIN_ROOT}/skills/` = `seo/claude-seo/skills/`.
- Les étapes qui lancent un script (`claude-seo run …`, Playwright, API DataForSEO / Google / PostHog) sont faites à la main ou ignorées.
- Mise à jour : la tâche « SEO audit hebdo » compare une fois par mois ce commit au dépôt d'origine et rafraîchit la copie si besoin.

Rapports produits : `seo/rapports/`.
