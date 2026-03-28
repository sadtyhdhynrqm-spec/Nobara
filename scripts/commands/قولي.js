const axios = require('axios');

const TTS_API_URL = 'https://nexalo-api.vercel.app/api/tts';

module.exports.config = {
  name: "قولي",
  aliases: ["tts", "نونو", "صوت"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "تحويل النص إلى صوت فتاة ناعم 🎙️",
  category: "وسائط",
  guide: "{pn} [النص المراد نطقه]",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    const userText = args.join(' ').trim();
    if (!userText) {
      api.setMessageReaction("⚠️", messageID, () => {}, true);
      return api.sendMessage("⚠️ يرجى كتابة النص الذي تريد مني نطقه!", threadID, messageID);
    }

    // تفاعل ساعة عند البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);

    // الرابط مع ضبط اللغة للعربية لضمان صوت الفتاة الافتراضي
    const apiUrl = `${TTS_API_URL}?text=${encodeURIComponent(userText)}&language=ar`;

    // طلب الملف الصوتي كـ Stream مباشر (أخف وأسرع)
    const response = await axios.get(apiUrl, {
      responseType: 'stream',
      timeout: 15000
    });

    const msg = {
      body: `🎙️ تـم تـحـويـل الـنـص إلـى صـوت: \n"${userText}"`,
      attachment: response.data
    };

    api.sendMessage(msg, threadID, () => {
      // تفاعل نجاح
      api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);

  } catch (err) {
    console.error("[خطأ في أمر النطق]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ عذراً، فشل تحويل النص إلى صوت حالياً.`, threadID, messageID);
  }
};
