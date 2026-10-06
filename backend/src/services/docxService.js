const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { getTemplateById, getTemplateDocxPath } = require('./templateService');

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Chuẩn hóa mã màu Hex sang định dạng 6 ký tự RRGGBB của Word
 */
function cleanHexColor(hex, defaultColor = '00B14F') {
  if (!hex) return defaultColor;
  const c = String(hex).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  return c.length === 6 ? c : defaultColor;
}

/**
 * Xây dựng nội dung XML cho file Word document.xml chuẩn ATS theo phong cách và màu sắc của mẫu CV
 */
function buildDocumentXml({ tmpl, cvData = {}, userProfile = {}, language = 'vi' }) {
  const isEn = language === 'en' || cvData.language === 'en';
  const color = cleanHexColor(tmpl.themeColor || '#00B14F');

  // 1. Thông tin ứng viên
  const name = cvData.fullName || userProfile.fullName || (isEn ? 'Huynh Kien Minh' : 'Huỳnh Kiến Minh');
  const role = cvData.targetRole || userProfile.targetRole || (isEn ? 'Backend Developer' : 'Lập trình viên Backend Node.js');
  const phone = userProfile.phone || cvData.phone || '(+84) 912 345 678';
  const email = userProfile.email || cvData.email || 'kienminh.dev@gmail.com';
  const address = cvData.address || userProfile.address || (isEn ? 'Can Tho, Vietnam' : 'Cần Thơ, Việt Nam');
  const summary = cvData.summary || userProfile.summary || '';

  // 2. Tiêu đề các mục chuẩn TopCV ATS
  const L = {
    summary: isEn ? 'EXECUTIVE SUMMARY' : 'MỤC TIÊU NGHỀ NGHIỆP',
    experience: isEn ? 'PROFESSIONAL EXPERIENCE' : 'KINH NGHIỆM LÀM VIỆC',
    education: isEn ? 'ACADEMIC BACKGROUND' : 'HỌC VẤN',
    skills: isEn ? 'CORE EXPERTISE' : 'KỸ NĂNG CHUYÊN MÔN',
    periodPrefix: isEn ? 'Period: ' : 'Thời gian: '
  };

  const xmlParts = [];
  xmlParts.push(`<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
<w:body>`);

  // HEADER BẢNG TIN ỨNG VIÊN
  xmlParts.push(`
<w:p>
  <w:r><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(name)}</w:t><w:br/></w:r>
  <w:r><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(role)}</w:t><w:br/></w:r>
  <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>📞 ${escapeXml(phone)}  |  ✉️ ${escapeXml(email)}  |  📍 ${escapeXml(address)}</w:t></w:r>
</w:p>`);

  // Helper hàm tạo tiêu đề mục kèm đường gạch kẻ màu thương hiệu của mẫu CV
  function addSectionHeader(title) {
    return `
<w:p>
  <w:pPr>
    <w:spacing w:before="160" w:after="60"/>
    <w:pBdr>
      <w:bottom w:val="single" w:sz="8" w:space="2" w:color="${color}"/>
    </w:pBdr>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="22"/></w:rPr>
    <w:t>${escapeXml(title)}</w:t>
  </w:r>
</w:p>`;
  }

  // 1. MỤC TIÊU NGHỀ NGHIỆP / EXECUTIVE SUMMARY
  if (summary) {
    xmlParts.push(addSectionHeader(L.summary));
    xmlParts.push(`
<w:p>
  <w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t>${escapeXml(summary)}</w:t></w:r>
</w:p>`);
  }

  // 2. KINH NGHIỆM LÀM VIỆC / PROFESSIONAL EXPERIENCE
  let exps = [];
  if (Array.isArray(cvData.tailoredExperience) && cvData.tailoredExperience.length > 0) {
    exps = cvData.tailoredExperience;
  } else if (Array.isArray(userProfile.experience) && userProfile.experience.length > 0) {
    exps = userProfile.experience;
  }

  if (exps.length > 0) {
    xmlParts.push(addSectionHeader(L.experience));
    for (const exp of exps) {
      const expRole = exp.role || exp.position || (isEn ? 'Backend Developer' : 'Lập trình viên Backend');
      const expComp = exp.organization || exp.company || 'ConnectCV';
      const expPeriod = exp.duration || exp.time || (isEn ? '06/2023 - Present' : '06/2023 - Hiện tại');
      const compRoleText = `${expRole} – ${expComp}`;

      xmlParts.push(`
<w:p>
  <w:pPr><w:spacing w:before="60" w:after="20"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(compRoleText)}</w:t><w:br/></w:r>
  <w:r><w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="17"/></w:rPr><w:t>${L.periodPrefix}${escapeXml(expPeriod)}</w:t></w:r>
</w:p>`);

      const bullets = exp.achievements || exp.bullets || [];
      for (const b of bullets) {
        if (!b) continue;
        xmlParts.push(`
<w:p>
  <w:pPr><w:pStyle w:val="ListBullet"/><w:spacing w:after="40"/></w:pPr>
  <w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(b)}</w:t></w:r>
</w:p>`);
      }
    }
  }

  // 3. HỌC VẤN / ACADEMIC BACKGROUND
  let edus = [];
  if (Array.isArray(cvData.education) && cvData.education.length > 0) {
    edus = cvData.education;
  } else if (Array.isArray(userProfile.education) && userProfile.education.length > 0) {
    edus = userProfile.education;
  }

  if (edus.length > 0) {
    xmlParts.push(addSectionHeader(L.education));
    for (const edu of edus) {
      const school = edu.school || (isEn ? 'FPT University' : 'Đại học FPT');
      const timeStr = edu.duration || edu.time || '2019 - 2023';
      const degree = edu.degree || (isEn ? 'Bachelor of Software Engineering' : 'Kỹ sư Kỹ thuật Phần mềm');
      const highlight = edu.highlights || edu.highlight || '';
      const schoolTimeText = timeStr ? `${school} (${timeStr})` : school;

      xmlParts.push(`
<w:p>
  <w:pPr><w:spacing w:before="60" w:after="20"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>${escapeXml(schoolTimeText)}</w:t><w:br/></w:r>
  <w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(degree)}</w:t><w:br/></w:r>
  ${highlight ? `<w:r><w:rPr><w:sz w:val="17"/></w:rPr><w:t>✦ ${escapeXml(highlight)}</w:t></w:r>` : ''}
</w:p>`);
    }
  }

  // 4. KỸ NĂNG CHUYÊN MÔN / CORE EXPERTISE
  let skillList = [];
  if (cvData.highlightedSkills) {
    if (Array.isArray(cvData.highlightedSkills.technical)) skillList.push(...cvData.highlightedSkills.technical);
    if (Array.isArray(cvData.highlightedSkills.soft)) skillList.push(...cvData.highlightedSkills.soft);
  }
  if (skillList.length === 0 && Array.isArray(cvData.matchedKeywords)) {
    skillList.push(...cvData.matchedKeywords);
  }
  if (skillList.length === 0 && Array.isArray(userProfile.skills)) {
    skillList.push(...userProfile.skills);
  }
  if (skillList.length === 0) {
    skillList = ['Node.js', 'Express', 'PostgreSQL', 'Docker', 'RESTful API', 'Git & CI/CD', 'Redis'];
  }

  if (skillList.length > 0) {
    xmlParts.push(addSectionHeader(L.skills));
    const joinedSkills = skillList.join(' • ');
    xmlParts.push(`
<w:p>
  <w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t>${escapeXml(joinedSkills)}</w:t></w:r>
</w:p>`);
  }

  // Cuối trang với lề và thông số khổ A4 tiêu chuẩn
  xmlParts.push(`
<w:sectPr w:rsidR="00FC693F" w:rsidRPr="0006063C" w:rsidSect="00034616">
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="720" w:right="864" w:bottom="720" w:left="864" w:header="720" w:footer="720" w:gutter="0"/>
  <w:cols w:space="720"/>
  <w:docGrid w:linePitch="360"/>
</w:sectPr>
</w:body>
</w:document>`);

  return xmlParts.join('\n');
}

/**
 * Sinh file Word (.docx) chuẩn theo đúng mẫu CV và dữ liệu người dùng
 */
async function generateCvDocx(options) {
  return require('./docxLayoutService').generateLayoutDocx(options);
}

function generateLegacyCvDocx({ templateId, cvData = {}, userProfile = {}, language = 'vi' }) {
  const isEn = language === 'en' || cvData.language === 'en';
  const tmplId = templateId || 'default_v2';
  const tmpl = getTemplateById(tmplId, language);

  // Tìm đường dẫn file mẫu gốc
  let baseDocxInfo = getTemplateDocxPath(tmplId, language);
  if (!baseDocxInfo) {
    baseDocxInfo = getTemplateDocxPath('default_v2', language);
  }

  if (!baseDocxInfo || !fs.existsSync(baseDocxInfo.path)) {
    throw new Error('Không tìm thấy file mẫu Word gốc để sinh tài liệu');
  }

  // Đọc file zip gốc của mẫu
  const zip = new AdmZip(baseDocxInfo.path);

  // Xây dựng document.xml mới chuẩn xác
  const newDocumentXml = buildDocumentXml({
    tmpl,
    cvData,
    userProfile,
    language
  });

  // Cập nhật file word/document.xml bên trong zip
  zip.updateFile('word/document.xml', Buffer.from(newDocumentXml, 'utf-8'));

  return zip.toBuffer();
}

module.exports = {
  generateCvDocx,
  buildDocumentXml
};
