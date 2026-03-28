const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GFX_API_URL = 'https://nexalo-api.vercel.app/api/gfx';

module.exports.config = {
  name: "تصميم",
  aliases: ["gfx", "شعار"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "إنشاء تصميم GFX باسمك مع اختيار رقم الستايل 🎨",
  category: "ترفيه",
  guide: "{pn} [الاسم] [الرقم] - مثال: {pn} Sinko 1 (الأرقام المتاحة من 1 إلى 4)",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let filePath;

  try {
    // التحقق من المدخلات
    if (args.length < 2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ يرجى إدخال الاسم ورقم الستايل (من 1 إلى 4).\nمثال: {pn} Sinko 2", threadID, messageID);
    }

    const gfxname = args[0];
    const gfxnumber = args[1];

    // التحقق من الرقم (يجب أن يكون بين 1 و 4)
    const number = parseInt(gfxnumber, 10);
    if (isNaN(number) || number < 1 || number > 4) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ عذراً، رقم الستايل يجب أن يكون بين 1 و 4 فقط.", threadID, messageID);
    }

    // تفاعل "ساعة" عند بدء العملية
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const apiUrl = `${GFX_API_URL}?gfxname=${encodeURIComponent(gfxname)}&gfxnumber=${number}`;

    // مسار الملف المؤقت
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `gfx_${crypto.randomBytes(8).toString('hex')}.png`;
    filePath = path.join(tempDir, fileName);

    // طلب الصورة من السيرفر
    const response = await axios.get(apiUrl, { timeout: 15000 });

    if (!response.data || !response.data.status || !response.data.url) {
      throw new Error("فشل السيرفر في توليد الرابط.");
    }

    const imageUrl = response.data.url;
    const imageResponse = await axios.get(imageUrl, { responseType: 'stream', timeout: 15000 });

    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const msg = {
      body: `🎨 تم إنشاء التصميم بنجاح!\nالاسم: ${gfxname}\nالستايل رقم: ${number}`,
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(msg, threadID, (err) => {
      if (!err) {
        // تفاعل "صح" عند النجاح
        api.setMessageReaction("✅", messageID, () => {}, true);
      }
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, messageID);

  } catch (err) {
    console.error("[خطأ في أمر GFX]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ حدث خطأ: ${err.message}`, threadID, messageID);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
