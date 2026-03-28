const axios = require('axios');

const BLACKBOX_API_URL = 'https://nexalo-api.vercel.app/api/blackbox';

module.exports.config = {
  name: "توليد",
  aliases: ["blackgen", "تخيل"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "توليد صور باستخدام الذكاء الاصطناعي",
  category: "ia",
  guide: "{pn} [وصف الصورة بالانجليزية]",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    const userPrompt = args.join(' ').trim();
    if (!userPrompt) {
      return api.sendMessage("⚠️ يرجى كتابة وصف للصورة التي تريد توليدها.", threadID, messageID);
    }

    // التفاعل بساعة رملية عند بدء المعالجة
    api.setMessageReaction("⏳", messageID, () => {}, true);
    
    api.sendMessage("", threadID, messageID);

    const apiUrl = `${BLACKBOX_API_URL}?prompt=${encodeURIComponent(userPrompt)}`;
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.blackboxUrl) {
      const blackboxImageUrl = response.data.blackboxUrl;

      const imageStream = await axios.get(blackboxImageUrl, { responseType: 'stream' }).then(res => res.data);

      const msg = {
        body: `✅ تم توليد الصورة بنجاح\nالوصف: ${userPrompt}`,
        attachment: imageStream
      };

      // التفاعل بعلامة صح عند النجاح
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error("لم يتم العثور على رابط الصورة.");
    }
  } catch (err) {
    // التفاعل بعلامة خطأ عند حدوث مشكلة
    api.setMessageReaction("❌", messageID, () => {}, true);
    console.error("[خطأ في أمر التوليد]", err.message);
    api.sendMessage(`❌ خطأ: ${err.message}`, threadID, messageID);
  }
};
