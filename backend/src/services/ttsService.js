const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const https = require('https');

// Cache đơn giản trong bộ nhớ để tái sử dụng audio nếu văn bản trùng nhau
const audioCache = new Map();

/**
 * Làm sạch văn bản trước khi đọc (bỏ ký tự markdown, emoji, dấu ngoặc kỹ thuật)
 */
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*_~`#>]/g, '') // Xóa ký tự markdown
    .replace(/\[.*?\]/g, '')  // Xóa [S], [T], [A], [R]...
    .replace(/\(.*?\)/g, '')  // Xóa nội dung trong ngoặc đơn nếu có
    .replace(/https?:\/\/\S+/g, '') // Xóa URL
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Xóa emoji
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Helper lấy một đoạn audio MP3 tiếng Việt từ Google Translate TTS
 */
function getGoogleTTSChunk(text) {
  return new Promise((resolve, reject) => {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=vi&client=tw-ob';
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('Google TTS status: ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Google TTS timeout'));
    });
  });
}

/**
 * Fallback tạo Audio Buffer MP3 tiếng Việt qua Google TTS (chia câu nếu văn bản dài)
 */
async function generateGoogleTTSFallback(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
  const parts = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > 160) {
      if (current) parts.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current) parts.push(current.trim());

  const audioBuffers = await Promise.all(parts.map(p => getGoogleTTSChunk(p)));
  return Buffer.concat(audioBuffers);
}

/**
 * Gọi Microsoft Edge TTS stream với khả năng cứu dữ liệu âm thanh khi socket đóng sớm
 */
function fetchEdgeTTS(cleaned, voiceName) {
  return new Promise(async (resolve, reject) => {
    let resolved = false;

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleaned);
      const chunks = [];

      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      audioStream.on('end', () => {
        if (!resolved) {
          resolved = true;
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        }
      });

      audioStream.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          // Nếu đã nhận được dữ liệu âm thanh (>1000 bytes) dù socket ngắt trước turn.end
          if (chunks.length > 0 && Buffer.concat(chunks).length > 1000) {
            return resolve(Buffer.concat(chunks));
          }
          reject(err);
        }
      });
    } catch (err) {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    }
  });
}

/**
 * Chuyển văn bản thành Audio Buffer MP3 chất lượng cao bằng Microsoft Edge Neural Voice
 * Có cơ chế cứu stream, tự động retry 1 lần và fallback Google Vietnamese TTS nếu cần
 * @param {string} text - Văn bản cần đọc
 * @param {string} voiceName - Tên giọng đọc ('vi-VN-NamMinhNeural' hoặc 'vi-VN-HoaiMyNeural')
 * @returns {Promise<Buffer>} Audio MP3 buffer
 */
async function generateSpeechMP3(text, voiceName = 'vi-VN-NamMinhNeural') {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    throw new Error('Văn bản rỗng sau khi làm sạch');
  }

  const cacheKey = `${voiceName}:${cleaned}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  let buffer = null;

  // Lần thử 1: Microsoft Edge Neural Voice
  try {
    buffer = await fetchEdgeTTS(cleaned, voiceName);
  } catch (err1) {
    // Lần thử 2: Thử lại Microsoft Edge TTS 1 lần nữa nếu lần 1 lỗi
    try {
      buffer = await fetchEdgeTTS(cleaned, voiceName);
    } catch (err2) {
      console.warn('[TTS Edge 2 attempts failed, switching to Google TTS fallback]');
    }
  }

  // Nếu cả 2 lần Edge TTS đều lỗi, dùng Google Vietnamese TTS fallback
  if (!buffer || buffer.length < 1000) {
    try {
      buffer = await generateGoogleTTSFallback(cleaned);
    } catch (gErr) {
      console.error('[TTS Google Fallback Error]:', gErr.message);
      throw new Error('Không thể tạo âm thanh giọng đọc từ tất cả nguồn TTS.');
    }
  }

  if (buffer && buffer.length > 0) {
    if (audioCache.size > 50) {
      const firstKey = audioCache.keys().next().value;
      audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, buffer);
    return buffer;
  }

  throw new Error('Không thể tạo file âm thanh');
}

module.exports = {
  generateSpeechMP3,
  cleanTextForSpeech
};
