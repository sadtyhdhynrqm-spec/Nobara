const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const WANTED_API_URL = 'https://nexalo-api.vercel.app/api/wanted';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.config = {
  name: "مطلوب",
  aliases: ["wanted", "مجرم"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "صنع ملصق مطلوب (Wanted) لصورتك أو لمن تمنشنه",
  category: "ترفيه",
  guide: "{pn} أو {pn} @منشن",
  usePrefix: true
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    // تفاعل ساعة عند البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);

    let targetID = senderID;
    let targetName = "أنت";

    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length > 0) {
      targetID = mentionIDs[0];
      targetName = mentions[targetID].replace('@', '').trim();
    }

    const profilePicUrl = getProfilePictureURL(targetID);
    const apiUrl = `${WANTED_API_URL}?url=${encodeURIComponent(profilePicUrl)}`;

    // طلب رابط الصورة من الـ API
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.url) {
      const wantedImageUrl = response.data.url;

      // جلب الصورة كـ Stream مباشر (أخف وأسرع)
      const imageStream = await axios({
        url: wantedImageUrl,
        method: "GET",
        responseType: "stream"
      }).then(res => res.data);

      const msg = {
        body: `💰 تم إصدار مذكرة اعتقال بحق: ${targetName}\nالمكافأة: حي أو ميت!`,
        attachment: imageStream
      };

      if (targetID !== senderID) {
        msg.mentions = [{ tag: `@${targetName}`, id: targetID }];
      }

      api.sendMessage(msg, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);
    } else {
      throw new Error("فشل في معالجة الصورة.");
    }
  } catch (err) {
    console.error("[خطأ في أمر مطلوب]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ فشل صنع الملصق، حاول لاحقاً.`, threadID, messageID);
  }
};
