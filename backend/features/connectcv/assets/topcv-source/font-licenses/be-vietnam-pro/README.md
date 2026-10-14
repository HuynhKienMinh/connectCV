# Be Vietnam Pro export fonts

The four normal weights (400, 500, 600, 700) combine the existing Latin and
Vietnamese subsets of Be Vietnam Pro v1.002. A single font object prevents PDF
text readers from inserting spaces at accented-character font boundaries.
Original font files, family names, outlines and advance metrics are retained.
No change to template CSS, candidate facts, typography or layout is intended.

Source font metadata: Copyright 2021 The Be Vietnam Pro Project Authors
(https://github.com/bettergui/BeVietnamPro), Version 1.002; ttfautohint v1.8.3,
with a SIL OFL license URL. The accompanying full `OFL.txt` was retrieved from
https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt.
The merged fonts remain under SIL Open Font License 1.1. This license covers
these fonts only; it does not establish rights to CV templates, photographs or
other fonts/assets, nor does it imply the authors endorse ConnectCV.

`../../merged-fonts.json` records inputs/outputs, SHA256 and tooling versions.
To rebuild offline, install the pinned tooling in a private environment and run
`tools/mergeNativeFonts.py` from the feature package. The build checks every
mapped glyph outline and advance metric plus the vertical metrics against the
original subsets. The server requires neither Python nor font-building tools.

Only the known original font resources are replaced during isolated server
rendering (`nativePdfFonts.js`). Interactive preview HTML retains original CSS.
Regression checks compare PDF pagination, DOM text geometry and saved crop,
and independently extract exact Vietnamese words using pypdf.
