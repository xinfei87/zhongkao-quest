import { buildHintLevels } from './hints.js';

const HAN = /\p{Script=Han}/u;
const LATIN = /\p{Script=Latin}/u;
const MAX_LENGTH = 200;
const ABBREVIATION = /\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|fig|no|inc|ltd|dept|approx|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.$|\b(?:[a-z]\.){2,}$/i;

export function detectLang(text) {
  return HAN.test(text) ? 'zh-CN' : 'en-US';
}

function isAbbreviation(text, index) {
  const before = text.slice(0, index + 1);
  const after = text.slice(index + 1);
  return (/\d\.$/.test(before) && /^\d/.test(after))
    || ABBREVIATION.test(before)
    || (/\b[a-z]\.$/i.test(before) && /^[a-z]\./i.test(after))
    || (/\b[A-Z]\.$/.test(before) && /^\s+[A-Z][a-z]/.test(after));
}

function appendChunks(output, sentence) {
  let chunk = '';
  // Keep Latin words (including contractions and hyphenated words) intact.
  const tokens = sentence.match(/[\p{Script=Latin}\p{M}\d]+(?:['’-][\p{Script=Latin}\p{M}\d]+)*|\s+|./gu) || [];
  for (const token of tokens) {
    if (chunk.length + token.length > MAX_LENGTH && chunk.trim()) {
      output.push(chunk.trim());
      chunk = '';
    }
    chunk += chunk ? token : token.trimStart();
  }
  if (chunk.trim()) output.push(chunk.trim());
}

export function splitUtterances(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  const sentences = [];
  let start = 0;
  for (const match of normalized.matchAll(/[。！？；!?]+|\.+/gu)) {
    if (match[0] === '.' && isAbbreviation(normalized, match.index)) continue;
    const end = match.index + match[0].length;
    appendChunks(sentences, normalized.slice(start, end));
    start = end;
  }
  appendChunks(sentences, normalized.slice(start));
  return sentences;
}

function splitLanguages(sentence) {
  const segments = [];
  let activeScript;
  let start = 0;
  for (const match of sentence.matchAll(/[\p{Script=Han}\p{Script=Latin}]/gu)) {
    const script = LATIN.test(match[0]) ? 'latin' : 'han';
    if (activeScript && script !== activeScript) {
      // Opening quotes and brackets belong with the text that follows.
      const opening = sentence.slice(start, match.index).match(/[“‘「『（(\[]+\s*$/u);
      const end = match.index - (opening?.[0].length || 0);
      segments.push(sentence.slice(start, end).trim());
      start = end;
    }
    activeScript = script;
  }
  segments.push(sentence.slice(start).trim());
  return segments.filter(Boolean);
}

/**
 * Build the prompt plan, or the explanation plan when an answer result is supplied.
 * shownHints is the number of hint levels already visible to the student.
 */
export function buildSpeakPlan(q, topic, shownHints = 0, result) {
  const choices = q.type === 'choice'
    ? [...(q.choices || [])].sort((a, b) => a.key.localeCompare(b.key))
    : [];
  const parts = [];

  if (!result) {
    parts.push(q.prompt, ...choices.map(({ key, text }) => `${key} ${text}`));
    if (shownHints > 0) parts.push(...buildHintLevels(q, topic).slice(0, shownHints));
  } else {
    parts.push(q.explanation);
    if (Array.isArray(q.steps)) parts.push(...q.steps);
    const { isCorrect, myAnswer } = result;
    if (!isCorrect && myAnswer) {
      const answerText = (key) => {
        const choice = choices.find((item) => item.key === key);
        return choice ? `${key}「${choice.text}」` : key;
      };
      const action = q.type === 'choice' ? '你选了' : '你填的是';
      parts.push(`你错在哪：${action} ${answerText(myAnswer)}，正确答案是 ${answerText(q.answer)}。`);
    }
    for (const { key } of choices) {
      const reason = q.whyWrong?.[key]?.trim();
      if (key !== q.answer && reason) parts.push(`${key}：${reason}`);
    }
  }

  return parts.flatMap(splitUtterances).flatMap(splitLanguages)
    .map((text) => ({ lang: detectLang(text), text }));
}
