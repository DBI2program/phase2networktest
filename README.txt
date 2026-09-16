DBI2 Phase 2 Collaboration Network — v2

Files
-----
index.html   Page structure and noindex/nofollow metadata
network.css  Styling
network.js   Interactive network logic
projects.js  Project data

Changes in v2
-------------
- Reformatted HTML, CSS and JavaScript with readable line breaks/indentation.
- Preserved noindex, nofollow.
- Larger network canvas and narrower information panel.
- More spacious force-directed layout.
- Person node size reflects number of proposed projects.
- Added Projects + people / Collaboration only toggle.
- Collaboration-only view links people who participate in the same proposed project.
- Thicker collaboration-only lines indicate multiple shared proposed projects.
- Improved selected-node highlighting and detail panel.
- Preserved search, position filtering, dragging and zoom.

Publishing
----------
Replace index.html, network.css and network.js in the existing
phase2networktest GitHub repository.

projects.js is also included in this package, but its project data were
preserved from the uploaded version.

GitHub Pages should redeploy automatically after the commit.
