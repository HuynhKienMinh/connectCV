'use strict';

const crypto = require('node:crypto');
const meta = require('../../assets/interview-bank/catalog.json');
const seed = require('../../assets/interview-bank/seed.json');
const STATUS = 'editorial_draft';
const normalize = value => typeof value === 'string' ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
const industries = new Map(meta.industries.map(row => [row.id, row]));
const levels = new Set(meta.levels.map(row => row.id));
const validText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const validList = (value, min = 1) => Array.isArray(value) && value.length >= min && value.length <= 12 && value.every(x => validText(x, 3, 600));
const copy = value => JSON.parse(JSON.stringify(value));

function normalizeLevel(value) {
  const key = normalize(value);
  const aliases = { intern: 'fresher', internship: 'fresher', 'entry level': 'fresher', 'moi vao nghe': 'fresher', fresher: 'fresher', junior: 'junior', mid: 'middle', 'mid level': 'middle', middle: 'middle', senior: 'senior', lead: 'lead', 'team lead': 'lead' };
  return aliases[key] || null;
}

function normalizeIndustry(value) {
  const key = normalize(value);
  if (!key) return null;
  const matches = meta.industries.filter(row => [row.id, row.label, ...row.aliases].some(alias => normalize(alias) === key));
  return matches.length === 1 ? matches[0].id : null;
}

function resolveIndustry(jobTitle) {
  const exact = normalizeIndustry(jobTitle);
  if (exact) return exact;
  const title = ` ${normalize(jobTitle)} `;
  if (title.trim().length > 300) return null;
  const matches = meta.industries.filter(row => row.aliases.some(alias => title.includes(` ${normalize(alias)} `)));
  // Ambiguous titles must be resolved by the user's explicit industry choice.
  return matches.length === 1 ? matches[0].id : null;
}

function validateRecord(row) {
  const errors = [];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return ['RECORD_OBJECT_REQUIRED'];
  if (!validText(row.id, 3, 90) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)) errors.push('INVALID_ID');
  if (!industries.has(row.industry)) errors.push('INVALID_INDUSTRY');
  if (!levels.has(row.level)) errors.push('INVALID_LEVEL');
  if (!validText(row.topic, 3, 80) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.topic)) errors.push('INVALID_TOPIC');
  if (!validText(row.question, 20, 800)) errors.push('INVALID_QUESTION');
  if (!validText(row.answerSample, 80, 2400)) errors.push('INVALID_ANSWER');
  if (!['knowledge', 'scenario', 'behavioral'].includes(row.answerType)) errors.push('INVALID_ANSWER_TYPE');
  if (!validList(row.keyPoints, 2)) errors.push('INVALID_KEY_POINTS');
  if (!validList(row.redFlags)) errors.push('INVALID_RED_FLAGS');
  if (!validList(row.evidencePrompts)) errors.push('INVALID_EVIDENCE_PROMPTS');
  if (row.reviewStatus !== STATUS) errors.push('UNSUPPORTED_REVIEW_STATUS');
  if (!row.provenance || row.provenance.kind !== 'editorial' || !Array.isArray(row.provenance.referenceUrls) || row.provenance.referenceUrls.length > 8 || row.provenance.referenceUrls.some(url => {
    try { const parsed = new URL(url); return parsed.protocol !== 'https:' || parsed.username || parsed.password; } catch { return true; }
  })) errors.push('INVALID_PROVENANCE');
  return errors;
}

function validateImport(rows) {
  if (!Array.isArray(rows) || rows.length > 100000) return { valid: false, errors: [{ index: null, codes: ['RECORD_ARRAY_REQUIRED_OR_LIMIT_EXCEEDED'] }] };
  const ids = new Set(), questions = new Set(), errors = [];
  rows.forEach((row, index) => {
    const codes = validateRecord(row);
    if (row && typeof row === 'object') {
      if (ids.has(row.id)) codes.push('DUPLICATE_ID');
      ids.add(row.id);
      // Exact normalized duplicates are rejected globally, not counted once per level.
      const questionKey = normalize(row.question);
      if (questions.has(questionKey)) codes.push('DUPLICATE_QUESTION');
      questions.add(questionKey);
    }
    if (codes.length) errors.push({ index, codes });
  });
  return { valid: errors.length === 0, errors };
}

const records = seed.records.map(row => ({ ...row, reviewStatus: STATUS, evidencePrompts: row.evidencePrompts || ['Nếu nêu kinh nghiệm, dùng bối cảnh, phần việc và bằng chứng thật của bạn; nói rõ khi chưa từng thực hiện.'], provenance: { kind: 'editorial', referenceUrls: row.referenceUrls || [], note: 'Biên soạn để luyện tập; tài liệu tham khảo hỗ trợ khái niệm, không chứng minh tần suất tuyển dụng.' } }));
const checked = validateImport(records);
if (!checked.valid) throw new Error('INTERVIEW_BANK_INVALID_SEED: ' + JSON.stringify(checked.errors));
const byId = new Map(records.map(row => [row.id, row]));
const byPair = new Map();
for (const row of records) {
  const key = `${row.industry}/${row.level}`;
  if (!byPair.has(key)) byPair.set(key, []);
  byPair.get(key).push(row);
}
function pairRows(industry, level) { return byPair.get(`${industry}/${level}`) || []; }

function catalog() {
  const coverage = meta.industries.flatMap(industry => meta.levels.map(level => {
    const count = pairRows(industry.id, level.id).length;
    return { industry: industry.id, level: level.id, draftCount: count, reviewedCount: 0, target: meta.targetPerIndustryLevel, remainingReviewed: meta.targetPerIndustryLevel, remainingAuthored: Math.max(0, meta.targetPerIndustryLevel - count), targetMet: false };
  }));
  return { schemaVersion: meta.schemaVersion, language: meta.language, industries: copy(meta.industries), levels: copy(meta.levels), targetPerIndustryLevel: meta.targetPerIndustryLevel, totalTarget: meta.industries.length * meta.levels.length * meta.targetPerIndustryLevel, totalDrafts: records.length, totalReviewed: 0, targetMet: false, status: 'SEED_ONLY_EXPANSION_AND_REVIEW_PENDING', disclosure: meta.disclosure, answerPolicy: meta.answerPolicy, coverage };
}

function listQuestions({ industry, level, topic, search, offset = 0, limit = 20, status = STATUS } = {}) {
  const industryId = normalizeIndustry(industry), levelId = normalizeLevel(level);
  const pageOffset = Number.isSafeInteger(Number(offset)) && Number(offset) >= 0 ? Math.min(Number(offset), 100000) : 0;
  const pageLimit = Number.isSafeInteger(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const query = normalize(typeof search === 'string' ? search.slice(0, 150) : '').split(' ').filter(Boolean);
  const rows = industryId && levelId && status === STATUS ? pairRows(industryId, levelId).filter(row =>
    (topic === undefined || row.topic === topic) && query.every(word => normalize(`${row.question} ${row.topic}`).includes(word))) : [];
  return { items: copy(rows.slice(pageOffset, pageOffset + pageLimit)), total: rows.length, offset: pageOffset, limit: pageLimit, nextOffset: pageOffset + pageLimit < rows.length ? pageOffset + pageLimit : null, industry: industryId, level: levelId, reviewStatus: STATUS, disclosure: meta.disclosure };
}

function getQuestion(id, scope) {
  if (typeof id !== 'string' || id.length > 90) return null;
  const row = byId.get(id);
  if (!row) return null;
  if (scope && (normalizeIndustry(scope.industry) !== row.industry || normalizeLevel(scope.level) !== row.level)) return null;
  return copy(row);
}

function selectQuestion({ industry, level, excludeIds = [], excludeTopics = [], seed: selectionSeed } = {}) {
  const industryId = normalizeIndustry(industry), levelId = normalizeLevel(level);
  if (!industryId || !levelId) return null;
  const ids = new Set(Array.isArray(excludeIds) ? excludeIds.filter(x => typeof x === 'string').slice(0, 10000) : []);
  const topics = new Set(Array.isArray(excludeTopics) ? excludeTopics.filter(x => typeof x === 'string').slice(0, 1000) : []);
  const available = pairRows(industryId, levelId).filter(row => !ids.has(row.id) && !topics.has(row.topic));
  if (!available.length) return null;
  // Optional seed changes the first question without storing candidate data or mutating the bank.
  const index = typeof selectionSeed === 'string' && selectionSeed.length <= 200 ? crypto.createHash('sha256').update(selectionSeed).digest().readUInt32BE(0) % available.length : 0;
  return copy(available[index]);
}

module.exports = { catalog, listQuestions, selectQuestion, getQuestion, resolveIndustry, normalizeIndustry, normalizeLevel, validateRecord, validateImport };
