const axios = require('axios');

const FLUX_API_URL = 'https://nexalo-api.vercel.app/api/flux';

module.exports.config = {
  name: "فلوكس",
  aliases: ["flux", "رسم"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "توليد صور عالية الجودة باستخدام ذكاء Flux الاصطناعي",
  category: "ذكاء اصطناعي",
  guide: "{pn} [وصف الصورة بالإنجليزية]",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    const userPrompt = args.join(' ').trim();
    if (!userPrompt) {
      return api.sendMessage("⚠️ يرجى كتابة وصف للصورة التي تريد رسمها.", threadID, messageID);
    }

    // التفاعل بساعة رملية عند البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);
    api.sendMessage("", threadID, messageID);

    const apiUrl = `${FLUX_API_URL}?prompt=${encodeURIComponent(userPrompt)}`;
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.imageUrl) {
      const fluxImageUrl = response.data.imageUrl;

      const imageStream = await axios({
        url: fluxImageUrl,
        method: "GET",
        responseType: "stream"
      }).then(res => res.data);

      const msg = {
        body: `✅ تم رسم الصورة بنجاح!\nالوصف: ${userPrompt}`,
        attachment: imageStream
      };

      // التفاعل بعلامة صح عند النجاح
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error(response.data.message || "فشل السيرفر في توليد الصورة.");
    }
  } catch (err) {
    // التفاعل بعلامة خطأ عند الفشل
    api.setMessageReaction("❌", messageID, () => {}, true);
    console.error("[خطأ في أمر فلوكس]", err.message);
    api.sendMessage(`❌ خطأ: ${err.message}`, threadID, messageID);
  }
};
