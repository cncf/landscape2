# Third-party notices

Landscape2 is licensed under the [Apache License 2.0](LICENSE). The following third-party files are bundled in this repository, embedded into the `landscape2` binary and shipped in every generated landscape website. They are distributed under their own licenses.

## Orbitron font

- **Files**: `ui/webapp/public/fonts/orbitron-medium-webfont.woff` (copied to `fonts/` in every generated website).
- **Copyright**: Copyright 2018 The Orbitron Project Authors (<https://github.com/theleagueof/orbitron>), with Reserved Font Name "Orbitron".
- **License**: [SIL Open Font License, Version 1.1](ui/webapp/public/fonts/OFL.txt). The license file lives in the same directory as the font, so it ships next to it in `fonts/OFL.txt` of every generated website.

## iframe-resizer child script

- **Files**: `ui/embed/public/assets/iframeResizer.contentWindow-v4.3.9.min.js` (copied to `embed/assets/` in every generated website, and loaded by the embeddable views only when their URL includes `iframe-resizer=true`).
- **Version**: 4.3.9.
- **Copyright**: (c) 2023 David J. Bradshaw.
- **License**: MIT. The license notice is kept in the header of the file.
- **Upstream**: <https://github.com/davidjbradshaw/iframe-resizer>.

This script is vendored and updated by hand: Dependabot cannot see it. It is intentionally held on 4.x, the last major version released under the MIT license (v5 is licensed under GPL-3.0 or a commercial license). Host pages must use the matching 4.x parent script, as described in the [README](README.md#resizing-embeds-with-iframe-resizer).
