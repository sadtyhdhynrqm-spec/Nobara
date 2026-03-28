const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SIM_API_URL = 'https://sim.api.nexalo.xyz/v1/chat';
const API_KEY = 'MAINPOINT'; 
const LANGUAGE = 'ar'; // تم تغيير اللغة للعربية

module.exports.config = {
  name: "نوبارا",
  aliases: ["nobara", "تحدث"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "الدردشة مع نوبارا المغرورة",
  category: "ذكاء اصطناعي",
  guide: "{pn} <نص الرسالة>",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const question = args.join(" ").trim();

  if (!question) {
    return api.sendMessage("هاه؟ هل أنت غبي؟ أرسل سؤالاً أولاً، لا أملك وقتاً لتضييعه مع الفاشلين! 🙄", threadID, messageID);
  }

  try {
    // التفاعل بساعة رملية عند البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const payload = {
      api: API_KEY,
      question: question,
      language: LANGUAGE
    };

    const response = await axios.post(SIM_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000 
    });
    const result = response.data;

    if (result.status_code === 200 && result.status === 'OK' && result.data) {
      const { answer, response_type, image_url } = result.data;

      if (response_type === 'image' && image_url) {
        const filePath = path.join(__dirname, "temp_image.jpg");

        const downloadImage = async (url, retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              const imageResponse = await axios({
                url,
                method: "GET",
                responseType: "stream",
                timeout: 30000, 
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });

              const writer = fs.createWriteStream(filePath);
              imageResponse.data.pipe(writer);

              return new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
              });
            } catch (err) {
              if (i < retries - 1) {
                await new Promise(res => setTimeout(res, 2000)); 
                continue;
              }
              throw err; 
            }
          }
        };

        await downloadImage(image_url);

        api.setMessageReaction("✅", messageID, () => {}, true);
        const msg = {
          body: "تفضل، انظر بتمعن لتعرف مدى روعتي! ✨", 
          attachment: fs.createReadStream(filePath)
        };

        api.sendMessage(msg, threadID, (err) => {
          if (err) {
            api.sendMessage("تشه، فشل إرسال الصورة.. لا تلمني أنا بل لم اتصالك الضعيف! 💢", threadID);
          }
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      } else {
        // الرد النصي العادي
        api.setMessageReaction("✅", messageID, () => {}, true);
        api.sendMessage(answer, threadID);
      }
    } else {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("أوه، يبدو أن النظام يرفض عقلك الصغير.. هناك خطأ ما! 🙄", threadID, messageID);
    }
  } catch (error) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`خطأ؟ حقاً؟ اسمع يا هذا، هناك خطأ تقني: ${error.message}`, threadID, messageID);
    const filePath = path.join(__dirname, "temp_image.jpg");
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
