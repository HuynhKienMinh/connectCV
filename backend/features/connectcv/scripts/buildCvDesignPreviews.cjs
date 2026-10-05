const fs = require('fs/promises');
const path = require('path');
const {getAvailableTemplates, PREVIEW_VERSION} = require('../src/services/templateService');
const {getTemplateThumbnail} = require('../src/services/templateThumbnailService');
const {getBrowser} = require('../src/services/pdfService');
const output = process.env.CV_DESIGN_PREVIEW_OUTPUT || path.resolve(__dirname, '../../frontend/public/cv-design-previews');
(async () => {
  try {
    let count = 0;
    for (const language of ['vi', 'en']) {
      const directory = path.join(output, PREVIEW_VERSION, language);
      await fs.mkdir(directory, {recursive: true});
      for (const template of getAvailableTemplates(language)) {
        await fs.writeFile(path.join(directory, template.id + '.png'), await getTemplateThumbnail(template.id, language));
        count++;
      }
    }
    if (count !== 148) throw new Error('Expected 148 preview variants, received ' + count);
    console.log(JSON.stringify({version: PREVIEW_VERSION, count, output}));
  } finally { await (await getBrowser()).close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
