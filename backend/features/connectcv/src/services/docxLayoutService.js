const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {prepareCvPage}=require('./cvRenderRuntime');
const {fontsDir,FONT_FILES}=require('./designRegistry');
const AdmZip = require('adm-zip');
const { getBrowser } = require('./pdfService');
const { getTemplateById, renderCVDataToTemplateHtml } = require('./templateService');
const xml = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pt = n => (n * .75).toFixed(2);
const PAGE_HEIGHT = 297 * 96 / 25.4;

// Preserve the browser layout with native Word shapes and editable text boxes.
// Images alone are rasterized, so text remains selectable and editable in Word.
async function generateLayoutDocxUnchecked({html,templateId,cvData={},userProfile={},language='vi'}) {
  let source = html || renderCVDataToTemplateHtml(getTemplateById(templateId || 'default_v2',language),cvData,userProfile,language);
  source = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  if (!/<base\b/i.test(source)) source=source.replace(/<head[^>]*>/i,'$&<base href="http://connectcv-frontend/">');
  const browser=await getBrowser(),page=await browser.newPage();
  try {
    await prepareCvPage(page,source);
    const layout=await page.evaluate(()=>{
      const root=document.querySelector('.cv-page-container');
      if(!root)throw new Error('Missing CV document');
      const origin=root.getBoundingClientRect();
      const box=r=>({x:r.left-origin.left,y:r.top-origin.top,w:r.width,h:r.height});
      const visible=el=>!el.closest('.no-print,.cv-toolbar,.cv-photo-editor') && getComputedStyle(el).display!=='none';
      const colors=c=>{
        const mixed=c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if(mixed)return mixed.slice(1,4).map(x=>Math.round(Number(x)*255).toString(16).padStart(2,'0')).join('');
        const m=c.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?/);
        return m && (!m[4] || Number(m[4])>0)?m.slice(1,4).map(x=>Number(x).toString(16).padStart(2,'0')).join(''):null;
      };
      const decorations=[];
      for(const el of root.querySelectorAll('*')) {
        if(!visible(el) || el.closest('.cv-photo-frame') || el.tagName==='IMG')continue;
        const r=el.getBoundingClientRect(),s=getComputedStyle(el),fill=colors(s.backgroundColor);
        if(r.width && r.height && (fill || parseFloat(s.borderTopWidth)>0))decorations.push({...box(r),fill,border:parseFloat(s.borderTopWidth)>0?colors(s.borderTopColor):null,borderWidth:parseFloat(s.borderTopWidth),radius:parseFloat(s.borderRadius)||0});
        const pseudo=getComputedStyle(el,'::before');
        if(pseudo.content!=='none' && pseudo.content!=='normal' && colors(pseudo.backgroundColor))decorations.push({...box(r),y:box(r).y+(parseFloat(pseudo.top)||0),h:parseFloat(pseudo.height)||0,fill:colors(pseudo.backgroundColor),border:null});
      }
      const text=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node=walker.currentNode,el=node.parentElement;
        if(!visible(el) || ['STYLE','SCRIPT'].includes(el.tagName) || !node.textContent.trim())continue;
        const s=getComputedStyle(el),range=document.createRange();let line=null;
        for(let i=0;i<node.length;i++) {
          range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();
          if(!r.width || !r.height)continue;
          if(!line || Math.abs(line.y-(r.top-origin.top))>2) {
            const firstFont=s.fontFamily.split(',')[0].replace(/["']/g,'').trim();
            // Preview fonts use local fallbacks; unavailable web-font names
            // must not become Times New Roman when opened by Word.
            const font=/^(Inter|Helvetica|sans-serif|system-ui|-apple-system|BlinkMacSystemFont)$/i.test(firstFont)?'Arial':firstFont==='serif'?'Times New Roman':firstFont==='monospace'?'Courier New':firstFont;
            line={...box(r),text:'',font,size:parseFloat(s.fontSize),color:colors(s.color)||'293B47',bold:Number(s.fontWeight)>=600,italic:s.fontStyle==='italic'};text.push(line);
          }
          line.text+=s.textTransform==='uppercase'?node.textContent[i].toLocaleUpperCase():s.textTransform==='lowercase'?node.textContent[i].toLocaleLowerCase():node.textContent[i];line.w=r.right-origin.left-line.x;
        }
        // CSS list markers are not text nodes. Include them explicitly in Word.
        if(el.tagName==='LI' && node===el.firstChild) {
          range.setStart(node,0);range.setEnd(node,Math.min(1,node.length));
          const r=range.getBoundingClientRect(),parent=el.parentElement;
          text.push({...box(r),x:box(r).x-16,w:14,text:parent.tagName==='OL'?`${[...parent.children].indexOf(el)+1}.`:'•',size:parseFloat(s.fontSize),color:colors(s.color)||'293B47',font:'Arial'});
        }
      }
      const images=[...root.querySelectorAll('img')].filter(visible).map((img,i)=>{const frame=img.closest('.cv-photo-frame')||img;img.dataset.docxImage=i;return {...box(frame.getBoundingClientRect()),index:i};});
      const bottom=Math.max(0,...text.map(t=>t.y+t.h),...images.map(i=>i.y+i.h));
      return {decorations,text,images,pages:Math.max(1,Math.ceil((bottom-.5)/(297*96/25.4)))};
    });
    const zip=new AdmZip(),relations=[],bodies=Array.from({length:layout.pages},()=>[]);let id=0;
    function shape(item,inner,extra='') {
      const pageIndex=Math.max(0,Math.min(layout.pages-1,Math.floor((item.y+.01)/PAGE_HEIGHT)));
      const style=`position:absolute;margin-left:${pt(item.x)}pt;margin-top:${pt(item.y-pageIndex*PAGE_HEIGHT)}pt;width:${pt(item.w)}pt;height:${pt(item.h)}pt;z-index:${++id};mso-position-horizontal-relative:page;mso-position-vertical-relative:page`;
      const tag=item.radius>=Math.min(item.w,item.h)/2?'oval':'rect';
      bodies[pageIndex].push(`<w:r><w:pict><v:${tag} id="cvshape${id}" style="${style}" ${extra}>${inner}<w10:wrap type="none"/></v:${tag}></w:pict></w:r>`);
    }
    // Render only the design layer: gradients, borders, curves and CSS icons.
    // Candidate text and photographs are added separately below.
    await page.evaluate(()=>{
      const root=document.querySelector('.cv-page-container');
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(node.textContent.trim()&&!['STYLE','SCRIPT'].includes(node.parentElement.tagName))nodes.push(node);
      }
      for(const node of nodes){
        const span=document.createElement('span');span.className='docx-hidden-text';
        span.style.setProperty('color','transparent','important');
        span.style.setProperty('text-shadow','none','important');
        node.replaceWith(span);span.appendChild(node);
      }
      root.querySelectorAll('img').forEach(img=>img.style.visibility='hidden');
    });
    await page.addStyleTag({content:'.cv-page-container li::marker{color:transparent!important}'});
    const rootBox=await page.$eval('.cv-page-container',el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}});
    for(let i=0;i<layout.pages;i++){
      if(rootBox.h<=i*PAGE_HEIGHT)continue;
      const h=Math.max(1,Math.min(PAGE_HEIGHT,rootBox.h-i*PAGE_HEIGHT));
      const background=await page.screenshot({type:'png',clip:{x:rootBox.x,y:rootBox.y+i*PAGE_HEIGHT,width:rootBox.w,height:h},captureBeyondViewport:true});
      const relId=`background${i}`;
      zip.addFile(`word/media/background${i}.png`,Buffer.from(background));
      relations.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/background${i}.png"/>`);
      shape({x:0,y:i*PAGE_HEIGHT,w:rootBox.w,h},`<v:imagedata r:id="${relId}" o:title="CV design background"/>`,'stroked="f"');
    }
    await page.evaluate(()=>{
      document.querySelectorAll('.docx-hidden-text').forEach(span=>span.replaceWith(...span.childNodes));
      document.querySelectorAll('.cv-page-container img').forEach(img=>img.style.removeProperty('visibility'));
    });
    for(const image of layout.images) {
      const handle=await page.$(`[data-docx-image="${image.index}"]`),frame=await handle.evaluateHandle(el=>el.closest('.cv-photo-frame')||el);
      const buffer=await frame.asElement().screenshot({type:'png'}),relId=`rIdImage${image.index}`;
      zip.addFile(`word/media/photo${image.index}.png`,Buffer.from(buffer));
      relations.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo${image.index}.png"/>`);
      shape(image,`<v:imagedata r:id="${relId}" o:title="CV photo"/>`,'stroked="f"');
    }
    for(const t of layout.text) {
      const size=Math.round(t.size*1.5);
      const paragraph=`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.ceil(t.h*15)}" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${xml(t.font)}" w:hAnsi="${xml(t.font)}" w:eastAsia="${xml(t.font)}" w:cs="${xml(t.font)}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${t.color}"/>${t.bold?'<w:b/>':''}${t.italic?'<w:i/>':''}</w:rPr><w:t xml:space="preserve">${xml(t.text)}</w:t></w:r></w:p>`;
      // Word's bold glyph metrics differ slightly from Chromium. Give each
      // measured line room so a heading cannot wrap underneath the next line.
      shape({...t,w:t.w*(t.size>=18?1.22:1.10)+18,h:t.h+6},`<v:textbox inset="0,0,0,0"><w:txbxContent>${paragraph}</w:txbxContent></v:textbox>`,'filled="f" stroked="f"');
    }
    const fontRelationships=[],fontRecords=[];
    const usedFamilies=[...new Set(layout.text.map(t=>t.font))];
    for(const family of usedFamilies){
      const definitions=FONT_FILES[family];if(!definitions)continue;
      let embeds='';
      for(const [label,weight,style] of definitions){
        if(label==='SemiBold')continue;
        const id='font'+fontRelationships.length,key=crypto.randomUUID().toUpperCase();
        const data=Buffer.from(fs.readFileSync(path.join(fontsDir,family.replace(/ /g,'')+'-'+label+'.ttf')));
        const guid=Buffer.from(key.replace(/-/g,''),'hex').reverse();for(let i=0;i<32;i++)data[i]^=guid[i%16];
        zip.addFile('word/fonts/'+id+'.odttf',data);
        fontRelationships.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${id}.odttf"/>`);
        const tag=style==='italic'?(weight===700?'embedBoldItalic':'embedItalic'):(weight===700?'embedBold':'embedRegular');
        embeds+=`<w:${tag} r:id="${id}" w:fontKey="{${key}}" w:subsetted="false"/>`;
      }
      fontRecords.push(`<w:font w:name="${xml(family)}">${embeds}</w:font>`);
    }
    zip.addFile('word/fontTable.xml',Buffer.from(`<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${fontRecords.join('')}</w:fonts>`));
    zip.addFile('word/_rels/fontTable.xml.rels',Buffer.from(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fontRelationships.join('')}</Relationships>`));
    zip.addFile('word/settings.xml',Buffer.from('<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:embedTrueTypeFonts/><w:saveSubsetFonts w:val="false"/></w:settings>'));
    relations.push('<Relationship Id="cvFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>','<Relationship Id="cvSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>');
    const body=bodies.map((shapes,i)=>`${i?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':''}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr>${shapes.join('')}</w:p>`).join('');
    zip.addFile('[Content_Types].xml',Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
    zip.addFile('_rels/.rels',Buffer.from('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
    zip.addFile('word/_rels/document.xml.rels',Buffer.from(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relations.join('')}</Relationships>`));
    zip.addFile('word/document.xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0"/></w:sectPr></w:body></w:document>`));
    return zip.toBuffer();
  } finally {await page.close().catch(()=>{});}
}
async function generateLayoutDocx(options){return require('./renderCapacity').withRenderSlot(()=>generateLayoutDocxUnchecked(options));}
module.exports={generateLayoutDocx};
