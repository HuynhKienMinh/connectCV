// Geometry and styling transcribed from the local TopCV snapshot catalogue.
// Every entry is explicit: an unregistered slug must never use another design.
const {getDesign}=require('./designRegistry');
const CATALOG=Object.fromEntries(Object.entries(require('../../assets/cv-designs/design-registry.json').templates).map(([slug,d])=>[slug,d.variants.vi.style]));
const SPECIAL = new Set(['bright','graceful','senior_2','tiktop']);
function escape(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function renderCatalogBody(slug,d) {
  if(SPECIAL.has(slug)) return null;
  const c=getDesign(slug,d.isEn?'en':'vi').style;
  if(!c) throw new Error(`Missing original layout for template ${slug}`);
  const {candidate,role,phone,email,address,birth,gender,summary,skills,experience,education,L,isEn,userProfile,cvData}=d;
  const website=escape(userProfile.website||userProfile.linkedin||cvData.website||'');
  const labels={summary:slug==='ambitious'?(isEn?'Objective':'Mục tiêu'):L.careerObjective,experience:L.workExperience,education:L.education,skills:L.skills,contact:slug==='ambitious'?(isEn?'Profile':'Thông tin cá nhân'):L.personalInfo,activities:isEn?'Activities':'Hoạt động',certifications:isEn?'Certifications':'Chứng chỉ',awards:isEn?'Honors & Awards':'Danh hiệu & giải thưởng',interests:isEn?'Interests':'Sở thích',references:isEn?'References':'Người tham chiếu',additional:isEn?'Additional Information':'Thông tin bổ sung'};
  const accent=c.a, dark=!!c.text;
  const photo=(size='')=>c.photo==='none'?'':`<div class="cat-photo ${size}"><img src="${d.candidateAvatar||'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${candidate}"></div>`;
  const identity=()=>`<h1 contenteditable="true">${candidate}</h1><p class="cat-role" contenteditable="true">${role}</p>`;
  const contact=(strip=false)=>`<div class="cat-contact ${strip?'cat-contact-strip':''}">${[['☎',phone],['✉',email],['⌖',address],['◎',website],['▣',birth]].filter(([,value])=>value).map(([icon,value])=>`<div class="cat-contact-item"><span class="cat-contact-icon">${icon}</span><span contenteditable="true">${value}</span></div>`).join('')}</div>`;
  const optional=key=>{
    let items=cvData[key]||userProfile[key]||[];
    if(typeof items==='string')items=[items];
    if(!Array.isArray(items))return '';
    return items.map(item=>{
      if(typeof item==='string')return `<p class="cat-extra" contenteditable="true">${escape(item)}</p>`;
      const name=item.name||item.title||item.organization||item.company||'';
      const date=item.duration||item.time||item.date||item.year||'';
      const detail=item.description||item.issuer||item.role||item.position||'';
      const points=item.achievements||item.bullets||[];
      return `<div class="cat-item"><b contenteditable="true">${escape(name)}</b>${date?`<p class="cat-date" contenteditable="true">${escape(date)}</p>`:''}${detail?`<p contenteditable="true">${escape(detail)}</p>`:''}${Array.isArray(points)&&points.length?`<ul>${points.map(p=>`<li contenteditable="true">${escape(p)}</li>`).join('')}</ul>`:''}</div>`;
    }).join('');
  };
  function section(key){
    if(key==='identity')return `${photo()}${identity()}`;
    if(key==='portrait')return photo();
    let content='';
    if(key==='summary')content=`<p contenteditable="true">${summary}</p>`;
    else if(key==='contact')content=contact();
    else if(key==='skills')content=skills.map(skill=>`<p class="cat-skill" contenteditable="true">${skill}${c.skillBars?'<span class="cat-skill-track" title="Chưa khai báo mức độ"></span>':''}${c.skillDots?'<span class="cat-skill-dots">○ ○ ○ ○ ○</span>':''}</p>`).join('');
    else if(key==='experience')content=experience.map(exp=>`<article class="cat-item cat-job"><div class="cat-item-top"><b class="cat-item-name" contenteditable="true">${slug==='ambitious'?exp.role:exp.company}</b><span class="cat-date" contenteditable="true">${exp.time}</span></div><p class="cat-item-role" contenteditable="true">${slug==='ambitious'?exp.company:exp.role}</p><ul>${exp.bullets.map(b=>`<li contenteditable="true">${b}</li>`).join('')}</ul></article>`).join('');
    else if(key==='education')content=education.map(edu=>`<article class="cat-item cat-study"><div class="cat-item-top"><b class="cat-item-name" contenteditable="true">${slug==='ambitious'?edu.degree:edu.school}</b><span class="cat-date" contenteditable="true">${edu.time}</span></div><p contenteditable="true">${slug==='ambitious'?edu.school:edu.degree}</p><p contenteditable="true">${edu.highlight}</p></article>`).join('');
    else content=optional(key);
    if(!content)return '';
    return `<section class="cat-section cat-${key}" data-section="${key}"><h2 contenteditable="true">${labels[key]}</h2>${content}</section>`;
  }
  const sections=keys=>(keys||[]).map(section).join('');
  const hasContactSection=[...(c.left||[]),...(c.right||[])].includes('contact');
  const headerCopy=()=>`<div class="cat-heading-copy">${identity()}${!c.contactStrip&&!hasContactSection?contact(true):''}${c.summaryInHero?`<p class="cat-header-summary" contenteditable="true">${summary}</p>`:''}</div>`;
  const headerPhoto=()=>c.left?.includes('portrait')||slug==='outstanding_5'?'':photo();
  let header=()=>`<header class="cat-header cat-header-${c.header||'left'}">${c.header==='right'?`${headerCopy()}${headerPhoto()}`:`${headerPhoto()}${headerCopy()}`}</header>`;
  let body='';
  const columnContent=()=>`<div class="cat-columns"><aside class="cat-left">${sections(c.left)}</aside><main class="cat-right">${sections(c.right)}</main></div>`;
  if(c.type==='side'||c.type==='rightSide'){
    const side=`<aside class="cat-sidebar">${c.nameFirst?identity():''}${photo()}${!c.nameFirst&&!c.nameAbove&&!c.hero?identity():''}${sections(c.left)}</aside>`;
    const main=`<main class="cat-main">${sections(c.right)}</main>`;
    body=`${c.nameAbove?`<div class="cat-name-strip">${identity()}</div>`:''}${c.hero?`<header class="cat-wide-hero">${identity()}</header>`:''}<div class="cat-side-grid">${c.type==='rightSide'?main+side:side+main}</div>`;
  }else if(c.type==='single'){
    body=`${header()}${c.contactStrip?contact(true):''}<main class="cat-single">${sections(c.left)}${c.bottom?`<div class="cat-bottom-grid">${sections(c.bottom)}</div>`:''}</main>`;
  }else if(c.type==='three'){
    body=`<div class="cat-three"><aside>${photo()}<div class="cat-yellow-identity">${identity()}</div>${sections(c.left)}</aside><main>${section('experience')}</main><aside>${sections(c.right)}</aside></div>`;
  }else if(c.type==='instagram'){
    body=`<div class="cat-social-nav"><b style="font:italic bold 22px Georgia">Topinstar</b><span class="cat-search">⌕ &nbsp; ${isEn?'Search':'Tìm kiếm'}</span><span>⌂ ♥ ◇</span></div><div class="cat-instagram-hero"><div class="cat-instagram-profile">${photo()}<p contenteditable="true">${email}<br>${phone}</p><span class="cat-follow">Follow</span></div><div>${identity()}<p class="cat-header-summary" contenteditable="true">${summary}</p><div class="cat-stories"><span class="cat-story-add">＋</span>${[[isEn?'Gender':'Giới tính',gender],[isEn?'Date of birth':'Ngày sinh',birth],[isEn?'Address':'Địa chỉ',address]].map(([label,value])=>`<span class="cat-story"><small>${label}</small><span contenteditable="true">${value}</span></span>`).join('')}</div></div></div>${columnContent()}`;
  }else if(c.type==='pinterest'){
    body=`<div class="cat-columns"><aside class="cat-left"><div class="cat-pinterest-nav">♟ &nbsp; &nbsp; Ⓟ &nbsp; &nbsp; ☏</div>${photo()}<div class="cat-reactions"><span>↶</span><span>★</span><span>♥</span><span>ϟ</span></div>${identity()}${sections(c.left)}</aside><main class="cat-right">${sections(c.right)}</main></div>`;
  }else if(c.type==='bannerSide'){
    body=`${header()}<div class="cat-side-grid"><aside class="cat-sidebar">${slug==='outstanding_5'?photo():''}${sections(c.left)}</aside><main class="cat-main">${sections(c.right)}</main></div>`;
  }else if(c.type==='hello'){
    body=`<div class="cat-columns"><aside class="cat-left"><div class="cat-hello">hello</div>${sections(c.left)}</aside><main class="cat-right">${photo()}${identity()}${sections(c.right)}</main></div>`;
  }else if(c.type==='minimal'){
    body=`<header class="cat-minimal-header">${photo()}<div>${identity()}<div class="cat-minimal-summary">${section('summary')}</div></div></header>${columnContent()}`;
  }else if(c.type==='threeHeader'){
    body=`${header()}<div class="cat-three-summary">${section('summary')}</div><div class="cat-bottom-grid cat-three-info">${sections(c.left)}</div><main class="cat-single">${sections(c.right)}</main>`;
  }else if(c.type==='formal'){
    const formalContacts=[['☎',phone],['✉',email],['◎',website],['⌂',address]].filter(([,v])=>v);
    const formalJob=exp=>`<article class="formal-job"><div class="formal-job-meta"><span class="formal-dot"></span><p contenteditable="true">${exp.time}</p><b contenteditable="true">${exp.company}</b></div><div class="formal-job-copy"><b contenteditable="true">${exp.role}</b>${exp.bullets.length?`<ul>${exp.bullets.map(b=>`<li contenteditable="true">${b}</li>`).join('')}</ul>`:''}</div></article>`;
    body=`<div class="formal-contact-strip">${formalContacts.map(([icon,v])=>`<div><span class="formal-contact-icon">${icon}</span><span contenteditable="true">${v}</span></div>`).join('')}</div><header class="formal-hero"><div class="formal-hero-copy">${identity()}${summary?`<p class="formal-summary" contenteditable="true">${summary}</p>`:''}</div>${photo()}</header>${experience.length?`<section class="formal-experience"><h2>${L.workExperience}</h2>${experience.map(formalJob).join('')}</section>`:''}<div class="formal-bottom">${sections(c.bottom)}</div>`;
  }else {
    const nav=c.type==='browser'?'<div class="cat-browser-bar">🔴 🟡 🟢 &nbsp; Curriculum Vitae &nbsp; ✚<div>‹ &nbsp; › &nbsp; ⟳ &nbsp; ▣ &nbsp; Curriculum Vitae</div></div>':c.type==='landing'?'<div class="cat-landing-nav"><b>TopLanding</b><span>Background &nbsp; Education &nbsp; Work &nbsp; Activities &nbsp; Skills</span></div>':c.type==='socialCards'?'<div class="cat-social-nav">ⓣ <span class="cat-search">⌕ Search</span> ⊕ ♟ ●</div>':c.type==='twitter'?'<div class="cat-twitter-bar">♥</div>':'';
    body=`${nav}${c.header!=='none'?header():''}${c.contactStrip?contact(true):''}${c.summaryTop?`<div class="cat-summary-top">${section('summary')}</div>`:''}${columnContent()}`;
  }
  const css=`
    .cv-page-container:has(.catalog-layout){height:auto!important;max-height:none!important;overflow:visible!important;background:${c.page||'#fff'}!important}
    .catalog-layout{--accent:${accent};--pale:${c.pale||'#f2f5f5'};background:${c.page||'#fff'};color:${c.text||'#252525'};font:12px/1.5 '${c.font||'Roboto'}',sans-serif;min-height:296mm;position:relative;isolation:isolate;${c.topBorder?'border-top:5px solid var(--accent);':''}}
    .catalog-layout h1{font-size:26px;line-height:1.25;font-weight:700;margin:0 0 7px;overflow-wrap:anywhere;${c.nameColor?`color:${c.nameColor}`:''}}.cat-role{font-size:12px;margin-bottom:12px}.catalog-layout h2{font-size:13px;line-height:1.35;margin:0 0 14px;padding:0 0 5px;font-weight:700;color:var(--accent);text-transform:uppercase;position:relative}
    .cat-section{margin-bottom:25px;position:relative;break-inside:auto}.catalog-layout p{margin:0 0 7px;overflow-wrap:anywhere}.catalog-layout ul{padding-left:16px;margin:7px 0 0}.catalog-layout li{margin-bottom:4px;overflow-wrap:anywhere}.cat-item{margin-bottom:22px;position:relative}.cat-item:last-child{margin-bottom:0}.cat-item-top{display:flex;gap:12px;justify-content:space-between;align-items:baseline}.cat-date{font-size:10px;flex-shrink:0;max-width:40%;font-weight:400}.cat-item-role{font-size:11px;margin-top:3px!important}.cat-extra{margin-bottom:12px!important}.cat-skill{margin-bottom:16px!important}
    .cat-contact{font-size:11px}.cat-contact-item{display:flex;align-items:baseline;gap:8px;margin:8px 0;overflow-wrap:anywhere}.cat-contact-icon{font-size:12px;flex-shrink:0;color:var(--accent)}.cat-contact-strip{display:flex;flex-wrap:wrap;gap:4px 20px;margin:12px 0}.cat-contact-strip .cat-contact-item{margin:2px 0}.cat-photo{width:150px;height:150px;overflow:hidden;flex-shrink:0;margin:0 0 20px;border-radius:${c.photo==='circle'?'50%':c.photo==='portrait'?'14px':'0'};${c.photo==='portrait'?'height:300px;width:100%;':''}}
    .cat-photo img{width:100%;height:100%;object-fit:cover;display:block}.cat-header{display:flex;gap:28px;align-items:center;padding:28px 28px 22px;background:${c.hero||'transparent'};${c.hero&&(c.heroText || ['#222','#000','#4b4b4b','#566d8d','#34414b','#79625b','#889f83','#21a6c6','#67aeb5'].includes(c.hero))?'color:white;':''}${c.slant?'padding-bottom:45px;clip-path:polygon(0 0,100% 0,100% 85%,0 100%);':''}}
    .cat-header .cat-photo{margin:0;width:130px;height:130px}.cat-heading-copy{flex:1;min-width:0}.cat-header-right{justify-content:space-between}.cat-header-right .cat-photo{margin:0}.cat-header-center,.cat-header-centerPhoto{flex-direction:column;text-align:center;gap:12px}.cat-header-center .cat-photo{width:95px;height:95px}.cat-header-centerPhoto{flex-direction:row;justify-content:center}.cat-header-centerPhoto .cat-photo{width:110px;height:140px}.cat-header-center .cat-contact{justify-content:center}.cat-header-split{justify-content:space-between}.cat-header-summary{margin:14px 0 0!important;font-size:12px}.cat-name-strip{padding:18px 25px 0;background:white}.cat-name-strip h1{font-size:19px}.cat-name-strip .cat-role{float:right;color:var(--accent)}.cat-wide-hero{padding:25px 30px;background:${c.hero||'transparent'};color:white;text-align:right}
    .cat-side-grid{display:grid;grid-template-columns:${c.type==='rightSide'?`${100-c.w}% ${c.w}%`:`${c.w}% minmax(0,1fr)`};min-height:296mm}.cat-sidebar{background:${c.side||'#fff'};color:${c.sideText||'#fff'};padding:25px 24px;min-width:0}.cat-sidebar h1{font-size:23px;color:var(--accent)}.cat-sidebar .cat-role{font-size:11px}.cat-sidebar .cat-photo{width:100%;height:auto;aspect-ratio:${c.photo==='portrait'?'0.7':'1'};${c.photo==='circle'?'border:4px solid #ddd;':''}}.cat-sidebar .cat-section{margin-bottom:28px}.cat-sidebar h2{color:var(--accent)}.cat-sidebar .cat-item-top{display:block}.cat-sidebar .cat-date{display:block;max-width:none;margin:5px 0}.cat-main{min-width:0;padding:28px 27px;background:${c.mainBg||'#fff'};color:#252525}.cat-columns{display:grid;grid-template-columns:${c.w}% minmax(0,1fr);gap:28px;padding:25px 28px}.cat-left,.cat-right{min-width:0}.cat-left{${c.alignLeft?'text-align:right;':''}${c.rightBg?'':''}}.cat-right{${c.rightBg?`background:${c.rightBg};padding:18px;`:''}}.cat-single{padding:10px 28px 28px}.cat-single .cat-section{margin-bottom:25px}.cat-single .cat-summary p{${c.justify?'text-align:justify;':''}}.cat-bottom-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 30px}.cat-three-info{grid-template-columns:repeat(3,minmax(0,1fr));padding:20px 28px}.cat-summary-top,.cat-minimal-summary,.cat-three-summary{padding:0 28px 10px}.cat-summary-top .cat-section{margin:0}
    .cat-skill-track{display:block;height:6px;background:#e0dcdc;margin:6px 0 12px}.cat-skill-track span{display:block;height:100%;width:82%;background:var(--accent)}.cat-skill-dots{display:block;color:var(--accent);letter-spacing:4px;font-size:15px}.cat-follow{display:inline-block;background:#5464a4;color:white;border-radius:3px;padding:6px 30px;font-size:11px}.cat-social-nav{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;gap:18px}.cat-search{background:#777;border-radius:30px;font-size:10px;padding:4px 20px;color:#eee;min-width:200px}.cat-instagram-hero{display:grid;grid-template-columns:30% minmax(0,1fr);gap:25px;padding:25px 30px}.cat-instagram-profile{text-align:center;font-size:11px}.cat-instagram-profile .cat-photo{width:145px;height:145px;border:5px solid #cb7176;margin:0 auto 16px}.cat-instagram-hero h1{font-size:25px;font-weight:400}.cat-instagram-hero .cat-role{font-size:11px}.cat-stories{display:flex;gap:20px;margin-top:24px}.cat-story,.cat-story-add{border-radius:50%;width:90px;height:90px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-size:10px;padding:8px;background:linear-gradient(30deg,#ff8b43,#df3662,#7561c1)}.cat-story small{font-size:10px}.cat-story-add{background:none;border:3px solid white;font-size:43px}.cat-pinterest-nav{text-align:center;margin-bottom:20px;color:#aaa;letter-spacing:8px}.cat-reactions{display:flex;justify-content:space-around;margin-bottom:25px;font-size:24px}.cat-reactions span{border-radius:50%;padding:6px 12px;box-shadow:0 3px 6px #0001}.cat-reactions span:nth-child(1){color:#efbd23}.cat-reactions span:nth-child(2){color:#47b7df}.cat-reactions span:nth-child(3){color:#61bfa3}.cat-reactions span:nth-child(4){color:#885aa1}.cat-twitter-bar{height:70px;background:#239cdb;text-align:right;padding:8px 25px;font-size:35px;color:#91d4ef}.cat-browser-bar{background:#e4f3fe;padding:12px;font-size:13px;color:#209bd4}.cat-browser-bar div{margin-top:14px;border-top:1px solid #ddd;padding-top:10px}.cat-landing-nav{display:flex;justify-content:space-between;padding:20px;color:var(--accent);font-size:10px}.cat-landing-nav b{font-size:20px}.cat-hello{font-size:125px;line-height:1;color:var(--accent);writing-mode:vertical-rl;font-weight:700;height:460px;margin:0 auto 30px;transform:rotate(180deg)}.cat-formal-hero{display:flex;gap:25px;padding:25px 28px;background:var(--pale)}.cat-formal-hero>div:first-child{flex:1}.cat-formal-hero .cat-photo{width:210px;height:260px}.cat-formal-hero .cat-summary h2{display:none}.cat-three{display:grid;grid-template-columns:30% 37% minmax(0,1fr);gap:22px;padding:22px}.cat-three aside,.cat-three main{min-width:0}.cat-three .cat-photo{width:100%;height:260px;border-radius:0}.cat-three h1{font-size:22px}.cat-yellow-identity{background:#ffed00;padding:12px;margin:10px 0 22px}.cat-three .cat-education{background:#ffed00;padding:12px}.cat-three .cat-item-top{display:block}.cat-three .cat-date{max-width:none;display:block;margin-top:7px}
  `;
  const formalCss=c.type==='formal'?`
    .catalog-formal{padding:14px 10px 20px;font-family:Roboto,sans-serif;font-size:14px;line-height:1.45;--accent:#ff8d6c;--pale:#e8e4df}
    .catalog-formal .formal-contact-strip{display:flex;justify-content:space-between;gap:18px;background:var(--pale);padding:12px 10px;margin-bottom:20px;min-height:59px;align-items:flex-start}
    .catalog-formal .formal-contact-strip>div{flex:1;display:flex;gap:12px;align-items:baseline;overflow-wrap:anywhere;font-size:13px}
    .catalog-formal .formal-contact-icon{color:var(--accent);font-size:17px;flex-shrink:0}
    .catalog-formal .formal-hero{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);background:var(--pale);margin-bottom:20px;align-items:start}
    .catalog-formal .formal-hero-copy{padding:22px 20px}
    .catalog-formal h1{font-size:26px;font-weight:700;color:#714a3a;margin:0 0 25px;line-height:1.2}
    .catalog-formal .cat-role{display:flex;align-items:center;gap:24px;font-size:17px;font-weight:bold;color:#111;margin:0 0 36px}
    .catalog-formal .cat-role:after{content:'';height:1px;background:#ff315d;width:140px;flex:0 1 140px}
    .catalog-formal .formal-summary{font-size:14px;line-height:1.45;margin:0}
    .catalog-formal .formal-hero .cat-photo{width:100%;height:auto;aspect-ratio:1;border-radius:0;margin:0;min-width:0}
    .catalog-formal .formal-hero .cat-photo img{height:100%;aspect-ratio:1;object-fit:cover}
    .catalog-formal .formal-experience{background:var(--pale);border-radius:8px;padding:12px 10px;margin-bottom:20px}
    .catalog-formal h2{color:#714a3a;font-size:16px;line-height:1.3;text-transform:none;border-bottom:1px solid var(--accent);padding:0 4px 7px;margin:0 0 13px}
    .catalog-formal .formal-job{display:grid;grid-template-columns:minmax(0,35%) minmax(0,65%);gap:0;margin:0 0 28px;break-inside:auto}
    .catalog-formal .formal-job:last-child{margin-bottom:0}
    .catalog-formal .formal-job-meta{position:relative;border-left:2px solid #bbb;margin-left:10px;padding:0 14px 0 23px;min-height:90px}
    .catalog-formal .formal-job-meta p{margin:0 0 10px}.catalog-formal .formal-job-meta b{font-size:13px}
    .catalog-formal .formal-dot{position:absolute;width:13px;height:13px;left:-8px;top:2px;border:2px solid #cfcbc6;border-radius:50%;background:var(--accent)}
    .catalog-formal .formal-job-copy{padding:0 4px 0 8px;min-width:0;font-size:14px}.catalog-formal .formal-job-copy ul{margin:10px 0 0;padding-left:18px}.catalog-formal .formal-job-copy li{margin-bottom:3px}
    .catalog-formal .formal-bottom{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .catalog-formal .formal-bottom .cat-section{padding:12px 10px;background:var(--pale);border-radius:8px;margin:0;min-width:0}
    .catalog-formal .formal-bottom .cat-item{padding-left:0}.catalog-formal .formal-bottom .cat-item:before{display:none}.catalog-formal .formal-bottom .cat-date{position:static;width:auto;max-width:none;display:block;margin:7px 0}.catalog-formal .formal-bottom .cat-item-top{display:block}
  `:'';
  const headingCss={
    rule:'.catalog-layout h2{border-bottom:1px solid var(--accent)}',
    thickRule:'.catalog-layout h2{border-top:5px solid #555;padding-top:10px;color:#111}',
    bar:'.catalog-layout h2{background:var(--accent);color:white;padding:5px 8px}',
    centerBar:'.catalog-layout h2{text-align:center;background:var(--pale);color:inherit;padding:6px}',
    pill:'.catalog-layout h2{border-radius:25px;background:var(--accent);color:white;padding:5px 13px}.cat-sidebar h2{background:#ffffff22}.cat-columns h2{background:var(--pale);color:var(--accent)}',
    box:'.catalog-layout h2{border:1px solid #555;text-align:center;color:inherit;padding:6px}',
    shortRule:'.catalog-layout h2:after{content:"";display:block;width:80px;height:5px;background:var(--accent);margin-top:5px}',
    socialRule:'.catalog-layout h2{color:white;font-weight:400}.catalog-layout h2:after{content:"";display:block;width:75px;height:3px;background:linear-gradient(90deg,#f0c160,#f05083,#8279cb);margin-top:5px}',
    hash:'.catalog-layout h2:before{content:"# ";color:#aaa}',
    hashRule:'.catalog-layout h2:before{content:"#"}.catalog-layout h2{border-bottom:4px solid #eee;text-transform:none}',
    vertical:'.catalog-layout h2{border-left:5px solid var(--accent);padding-left:9px;color:inherit}',
    icon:'.catalog-layout h2:before{content:"▣";display:inline-flex;border-radius:50%;background:var(--accent);color:white;margin-right:9px;padding:4px 7px}',
    rocket:'.catalog-layout h2:before{content:"♟ ";margin-right:5px}',
    dualRule:'.catalog-layout h2{border-bottom:2px solid #6e4a91}.catalog-layout h2:after{content:"";position:absolute;bottom:-2px;left:35%;width:25%;height:2px;background:#bd8c47}',
    colorRule:'.catalog-layout h2{color:inherit}.catalog-layout h2:after{content:"";display:block;width:75px;height:7px;background:var(--accent);margin-top:5px}.cat-summary h2:after{background:#efc665}.cat-skills h2:after{background:#a2c2e6}.cat-interests h2:after{background:#d5a2dd}',
    timeline:'.cat-single{border-left:1px solid #444;margin-left:90px;padding-left:18px}.catalog-layout h2{border-bottom:1px solid #444;color:#111}.catalog-layout h2:before{content:"▣";position:absolute;left:-33px;top:0;background:white;font-size:18px}.catalog-layout{background:linear-gradient(110deg,#e8e1fa,white 40%)}',
  }[c.heading]||'';
  const extraCss=`${c.cards?`.cat-section{padding:16px;border-radius:12px;background:var(--pale);box-shadow:0 2px 4px #00000005}.cat-section h2{font-size:13px}`:''}
    .cat-section{margin-bottom:20px}.cat-item{margin-bottom:18px}.cat-skill{margin-bottom:12px!important}
    .cat-skill-track{height:4px;margin:3px 0 0}.cat-skill:has(.cat-skill-track){margin-bottom:8px!important}
    ${c.timeline?`.cat-job,.cat-study{padding-left:95px}.cat-job .cat-date,.cat-study .cat-date{position:absolute;left:0;top:0;width:80px;max-width:80px}.cat-job:before,.cat-study:before{content:'';position:absolute;left:87px;top:0;bottom:0;border-left:1px solid #bbb}.cat-sidebar .cat-job,.cat-sidebar .cat-study{padding-left:0}.cat-sidebar .cat-date{position:static;width:auto}`:''}
    ${c.type==='browser'?'.catalog-layout{background-color:#eaf6ff;background-image:linear-gradient(#ffffff88 1px,transparent 1px),linear-gradient(90deg,#ffffff88 1px,transparent 1px);background-size:45px 45px}.cat-header{background:#fff;border-radius:14px;margin:25px 22px 0}.cat-section{background:white}':''}
    ${c.type==='bannerSide'?'.cat-side-grid{min-height:900px}.cat-header{min-height:175px}.cat-header .cat-photo{width:140px;height:140px}':''}
    ${c.type==='creative'?'.cat-header{background:linear-gradient(110deg,#a7bcc6 36%,transparent 36%)}.cat-header .cat-photo{border:12px solid #cad9db}.cat-header-summary{font-size:12px}':''}
    ${c.type==='minimal'?'.cat-minimal-header{display:grid;grid-template-columns:205px 1fr;gap:25px;padding:25px 28px}.cat-minimal-header .cat-photo{width:205px;height:240px;margin:0}.cat-minimal-header h1{border-left:3px solid #555;padding-left:10px}.cat-minimal-summary{padding:15px;background:#f3f3f3;font-size:11px}.cat-minimal-summary h2{display:none}.cat-education{background:#243440;color:white;padding:20px}.cat-education h2{color:white}.cat-columns{padding-top:0}':''}
    ${c.type==='developer'?'.catalog-layout{font-size:11px}.cat-columns{grid-template-columns:1fr}.cat-right{display:grid;grid-template-columns:1fr 1fr;gap:25px}.cat-contact-strip{font-size:10px}':''}
    ${c.photoFull?'.cat-sidebar .cat-photo{margin-left:-24px;width:calc(100% + 48px);aspect-ratio:.68}':''}
    ${c.hero&&c.type==='rightSide'?'.cat-side-grid{min-height:calc(296mm - 125px)}':''}
    ${c.nameAbove?'.cat-side-grid{min-height:calc(296mm - 80px)}':''}
    ${c.pillContacts?'.cat-contact-item{background:var(--accent);border-radius:30px;padding:3px 10px;color:#fff;font-size:10px}.cat-contact-icon{color:white}':''}
    ${c.type==='spotify'?'.cat-header{align-items:flex-start;padding:30px}.cat-header .cat-photo{width:125px;height:125px}.cat-header h1{font-size:28px;font-weight:400}.cat-header-summary{font-size:11px}.cat-header .cat-role{font-size:10px;text-transform:uppercase;color:#ddd}.catalog-layout h2{font-weight:400}':''}
    ${c.type==='twitter'?'.cat-header{padding-top:0}.cat-header .cat-photo{border:4px solid #eee;margin-top:-20px}.cat-summary-top h2{font-size:12px}.cat-summary-top{padding-top:15px}':''}
    ${slug==='outstanding_5'?'.cat-header{min-height:165px;padding-left:42%;color:white}.cat-sidebar .cat-photo{width:170px;height:170px;margin-top:-90px;border:10px solid white;margin-left:auto;margin-right:auto}.cat-sidebar .cat-contact{text-align:center}.cat-sidebar .cat-contact-item{display:block}':''}
    ${slug==='outstanding_3'?'.cat-header .cat-photo{border:8px solid #2d414b}.cat-contact-strip{background:#00b454;color:white;padding:12px 25px;margin:0}.cat-contact-icon{color:white}.cat-summary{background:#2d414b;color:white;padding:15px}.cat-summary h2{color:white}':''}
    ${slug==='outstanding_9'?'.cat-header h1{border:2px solid #31545a;padding:15px;font-weight:400}.cat-header .cat-photo{height:150px}':''}
    ${slug==='pro_4'?'.cat-sidebar h2{background:none;color:#1298b4;border:1px solid #119ec0;text-align:center}.cat-sidebar .cat-photo{width:150px;height:150px;margin-left:auto;margin-right:auto;border:3px solid #119ec0}.cat-sidebar h1{text-align:center}':''}
    ${slug==='student_3'?'.cat-sidebar .cat-section{background:none;padding:0;box-shadow:none}.cat-sidebar h2{background:#096ca8;color:white;text-align:center;padding:6px;border-radius:25px}.cat-main h2{background:none;color:#222;padding:0;border-radius:0}.cat-main{border-left:1px solid #777}.cat-main .cat-section:before{content:"";width:9px;height:9px;border-radius:50%;background:#324653;position:absolute;left:-33px;top:0}':''}
    ${slug==='landing'?'.cat-header{background:#e9f6ff;border-radius:0 0 55% 30%}.cat-summary-top{background:#e9f6ff;padding:18px 28px 25px}.cat-contact-strip{padding:15px 28px;justify-content:space-around;background:#f5f8fa}.cat-contact-item{flex-direction:column;background:white;padding:10px;box-shadow:0 2px 6px #0001}.cat-header h1{font-size:23px}':''}
    ${slug==='impressive_5'?'.cat-header{border-left:3px solid var(--accent);border-right:3px solid var(--accent);margin:22px 22px 0;padding:0 15px}.cat-header .cat-photo{height:195px;width:130px}.cat-header .cat-role{color:var(--accent)}':''}
    ${slug==='vintage'?'.cat-header .cat-contact{display:none}':''}
    ${['cv_color','clarity','modern_2_v2','onepage_impressive_3_v2','passion'].includes(slug)?'.cat-sidebar .cat-photo{width:180px;height:180px;margin-left:auto;margin-right:auto}':''}
    ${slug==='student_3'?'.cat-sidebar .cat-photo{width:230px;height:230px;margin-left:auto;margin-right:auto}.cat-sidebar h1{color:#1167a3}':''}
    ${c.decor==='grid'?'.catalog-layout{background-image:linear-gradient(#d9e2e333 1px,transparent 1px),linear-gradient(90deg,#d9e2e333 1px,transparent 1px);background-size:25px 25px}':''}
    ${c.decor==='peach'?'.cat-sidebar{background:linear-gradient(105deg,#fbd8b3,#fae9e4 65%,white)}.cat-main{background:linear-gradient(270deg,#fbe2cf,white 35%)}':''}
    ${c.decor==='wave'?'.catalog-layout{border-top:9px solid #765478;background:radial-gradient(ellipse at 95% 35%,#f2effb 0 38%,transparent 38%),radial-gradient(ellipse at 0% 90%,#f2effb 0 18%,transparent 18%),white}':''}
    ${c.decor==='organic'?'.catalog-layout{background:radial-gradient(ellipse at 100% 0,#c5c5c5 0 16%,transparent 16%),radial-gradient(ellipse at 100% 65%,#cbf1d8 0 12%,transparent 12%),white}.cat-header .cat-photo{border-radius:45% 30% 35% 45%;border:12px solid #c6f0d7;width:200px;height:220px}.cat-contact{background:#c9f2d8;border-radius:40% 30%;padding:15px}':''}
    ${c.decor==='rings'||c.decor==='orbits'?'.cat-header{position:relative;overflow:hidden}.cat-header:before{content:"";position:absolute;z-index:-1;width:340px;height:340px;border:2px solid #95cbee;border-radius:50%;right:-45px;top:-80px;box-shadow:0 0 0 36px #a8deee35,0 0 0 70px #a8deee20}.cat-header .cat-photo{z-index:1}.catalog-layout{background:linear-gradient(140deg,#dff7fc,white 60%)}':''}
    @media print{.catalog-layout{min-height:296mm}.cat-section{break-inside:auto}.cat-item{break-inside:avoid}}
  `;
  const referenceCss=slug==='time'?`.catalog-time h2{color:#111}`:slug==='ambitious'?`
    .catalog-ambitious{font-size:13px;line-height:1.5}.catalog-ambitious h1{font-size:25px;font-weight:700;line-height:1.25;margin-bottom:10px}
    .catalog-ambitious .cat-sidebar{padding:26px 25px}.catalog-ambitious .cat-main{padding:31px 28px}
    .catalog-ambitious .cat-role{font-size:16px;color:var(--accent);margin-bottom:27px}
    .catalog-ambitious h2{display:flex;align-items:center;gap:14px;font-size:16px;font-weight:700;text-transform:none;border:0;padding:0;margin-bottom:20px;white-space:nowrap}
    .catalog-ambitious h2:after{content:'';height:1px;background:var(--accent);flex:1;min-width:12px}
    .catalog-ambitious .cat-contact-item{font-size:13px;margin:8px 0;gap:15px}
    .catalog-ambitious .cat-item-role{font-size:13px;font-weight:700;margin:12px 0!important}
    .catalog-ambitious .cat-date{font-size:13px;font-weight:700}.catalog-ambitious .cat-section{margin-bottom:28px}
  `:'';
  return `<style>${css}${headingCss}${extraCss}${formalCss}${referenceCss}</style><div class="catalog-layout catalog-${slug}" data-original-layout="${slug}" data-layout-type="${c.type}">${body}</div>`;
}
module.exports={CATALOG,SPECIAL,renderCatalogBody};
