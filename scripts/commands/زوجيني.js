const axios = require('axios');

const PAIR_API_URL = 'https://nexalo-api.vercel.app/api/pair';
const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';

// مقولات عربية فخمة لتناسب الأجواء
const pairQuotes = [
  "أنت اليوم وكل غدٍ لي.. في هذا العالم الواسع.",
  "الحب ليس مجرد شعور، بل هو فعل نثبته كل يوم.",
  "وجدت فيك الصديق الأوفى وحب حياتي الوحيد.",
  "أجمل ما نتمسك به في هذه الحياة هو بعضنا البعض.",
  "القلوب التي تنبض معاً، لا تفرقها المسافات.",
  "أنت وجهتي الوحيدة في هذا العالم المليء بالمتاهات.",
  "لا يوجد عائق يمنع القلوب الصادقة من اللقاء."
];

module.exports.config = {
  name: "زوجيني",
  aliases: ["pair", "نصيب", "كوبل"],
  version: "1.1",
  author: "سينكو",
  countDown: 10,
  adminOnly: false,
  description: "اختيار شريك عشوائي من المجموعة وصنع صورة تجمعكما 💘",
  category: "ترفيه",
  guide: "{pn}",
  usePrefix: true
};

async function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID } = event;

  try {
    // تفاعل "ساعة" عند البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const threadInfo = await api.getThreadInfo(threadID);
    const participants = threadInfo.participantIDs;

    if (participants.length < 2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ يا برو، أحتاج لشخصين على الأقل في المجموعة لنصنع توافقاً!", threadID, messageID);
    }

    // اختيار مستخدم عشوائي غير صاحب الأمر
    const otherMembers = participants.filter(id => id !== senderID);
    const randomUserID = otherMembers[Math.floor(Math.random() * otherMembers.length)];

    const userInfo = await api.getUserInfo([senderID, randomUserID]);
    const commandUserName = userInfo[senderID]?.name || "مستخدم";
    const randomUserName = userInfo[randomUserID]?.name || "شريك مجهول";

    const commandUserPic = await getProfilePictureURL(senderID);
    const randomUserPic = await getProfilePictureURL(randomUserID);

    // طلب الصورة من API
    const pairResponse = await axios.get(PAIR_API_URL, {
      params: {
        image1: commandUserPic,
        image2: randomUserPic
      },
      timeout: 15000
    });

    if (pairResponse.data && pairResponse.data.status) {
      const pairImageURL = pairResponse.data.url;
      const randomQuote = pairQuotes[Math.floor(Math.random() * pairQuotes.length)];

      // تحميل الصورة كـ Stream مباشر (أخف طريقة)
      const imageStream = await axios.get(pairImageURL, { responseType: 'stream' }).then(res => res.data);

      const msg = {
        body: `┌  ＮＯＢＡＲＡ • ＭＡＴＣＨ  ┐\n┕━━━━━━━━━━━━━━━━━━━━┙\n\n💘 إنذار الحب! تم العثور على شريكك اليوم:\n\n▸ الـطرف الأول : ${commandUserName}\n▸ الـطرف الثاني : ${randomUserName}\n\n" ${randomQuote} "`,
        attachment: imageStream
      };

      api.sendMessage(msg, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } else {
      throw new Error("فشل في جلب صورة التوافق من السيرفر.");
    }

  } catch (error) {
    console.error("[خطأ في أمر التوافق]", error.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ حدث خطأ: ${error.message}`, threadID, messageID);
  }
};
