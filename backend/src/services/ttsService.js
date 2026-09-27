const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

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
 * Chuyển văn bản thành Audio Buffer MP3 chất lượng cao bằng Microsoft Edge Neural Voice
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

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    let timer = null;
    try {
      const { audioStream } = tts.toStream(cleaned);
      const chunks = [];

      timer = setTimeout(() => {
        if (chunks.length > 0) {
          const buffer = Buffer.concat(chunks);
          audioCache.set(cacheKey, buffer);
          resolve(buffer);
        } else {
          reject(new Error('TTS timeout: stream took too long'));
        }
      }, 3500);

      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      audioStream.on('end', () => {
        clearTimeout(timer);
        const buffer = Buffer.concat(chunks);
        // Lưu cache tối đa 100 mục gần nhất
        if (audioCache.size > 100) {
          const firstKey = audioCache.keys().next().value;
          audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, buffer);
        resolve(buffer);
      });

      audioStream.on('error', (err) => {
        clearTimeout(timer);
        if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(err);
        }
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      reject(err);
    }
  });
}

module.exports = {
  generateSpeechMP3,
  cleanTextForSpeech
};
