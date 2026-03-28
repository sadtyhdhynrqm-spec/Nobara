const axios = require('axios');

const TRAIN_API_URL = 'https://sim.api.nexalo.xyz/v1/train';
const API_KEY = 'MAINPOINT'; 
const LANGUAGE = 'ar'; // تم التغيير للعربية ليدعم ردودك

module.exports.config = {
  name: "علمني",
  aliases: ["teach", "تدريب", "تعلم"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "تعليم البوت ردوداً جديدة (سؤال وإجابة) عبر Nexalo SIM 🧠",
  category: "نظام",
  guide: "{pn} [السؤال] | [الإجابة]",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const input = args.join(" ").trim();

  // التحقق من وجود الفاصل |
  if (!input.includes("|")) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("⚠️ يرجى تقديم السؤال والإجابة مفصولين بـ '|'.\nمثال: {pn} كيف حالك؟ | أنا بخير يا مطوري سينكو", threadID, messageID);
  }

  const [question, answer] = input.split("|").map(item => item.trim());

  if (!question || !answer) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("⚠️ لا يمكن ترك السؤال أو الإجابة فارغين!", threadID, messageID);
  }

  try {
    // تفاعل "ساعة" عند بدء العملية
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const payload = {
      api: API_KEY,
      question: question,
      answer: answer,
      language: LANGUAGE
    };

    const response = await axios.post(TRAIN_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000 
    });

    const result = response.data;

    // التحقق من نجاح العملية (حسب استجابة Nexalo API)
    if (result.status_code === 201 || result.status === 'Created') {
      api.setMessageReaction("✅", messageID, () => {}, true);
      
      const successMsg = `
┌  ＮＯＢＡＲＡ • ＴＲＡＩＮ  ┐
┕━━━━━━━━━━━━━━━━━━━━┙

■ [ تـم الـتـعـلـيم بـنـجـاح ]
▸ الـسؤال : ${question}
▸ الإجـابة : ${answer}
▸ الـلغـة : الـعـربية

┌━━━━━━━━━━━━━━━━━━━━┐
┕  ＰＯＷＥＲＥＤ BY ＳＩＮＫＯ  ┙`.trim();
      
      api.sendMessage(successMsg, threadID, messageID);
    } else {
      throw new Error(result.message || 'خطأ غير معروف من السيرفر');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error("❌ خطأ في أمر التعليم:", error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ فشل التعليم: ${errorMessage}`, threadID, messageID);
  }
};
