const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

module.exports = {
  name: "التحميل_التلقائي",
  handle: async function({ api, event }) {
    const { threadID, messageID, body, senderID } = event;

    // منع البوت من الرد على نفسه أو إذا كانت الرسالة فارغة
    if (senderID === api.getCurrentUserID() || !body) return;

    // استخراج أول رابط يظهر في الرسالة
    const urlMatch = body.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return;

    const url = urlMatch[0];
    
    // التحقق من أن الرابط من المنصات المدعومة لتقليل الضغط على السيرفر
    const supportedPlatforms = [
      "facebook.com", "fb.watch", "tiktok.com", 
      "instagram.com", "youtu.be", "youtube.com", 
      "twitter.com", "x.com"
    ];

    if (!supportedPlatforms.some(platform => url.includes(platform))) return;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      // استخدام الـ API المستقر الذي أرسلته (noobs-api.top)
      const apiEndpoint = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
      
      const response = await axios.get(apiEndpoint, { timeout: 30000 });
      const videoData = response.data;

      if (!videoData || !videoData.result) {
        // إذا لم يجد الرابط لا نفعل شيئاً في الأحداث لعدم إزعاج المستخدم
        return; 
      }

      const videoUrl = videoData.result;
      const title = videoData.title || "فيديو";

      // إنشاء ملف مؤقت في مجلد الكاش
      const fileName = `nobara_${crypto.randomBytes(4).toString('hex')}.mp4`;
      const filePath = path.join(__dirname, '..', '..', fileName);
      const writer = fs.createWriteStream(filePath);

      const videoResponse = await axios({
        url: videoUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 120000
      });

      videoResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // التأكد من الحجم المسموح في مسنجر (أقل من 85 ميجا)
      if (stats.size > 85 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        return api.sendMessage(`┌  ＮＯＢＡＲＡ • ＳＩＺＥ  ┐\n┕━━━━━━━━━━━━━━━┙\n\n⚠️ الحجم كبير جداً: ${fileSizeMB} MB\n▸ الحد الأقصى: 85 MB`, threadID, messageID);
      }

      const msg = {
        body: `┌  ＮＯＢＡＲＡ • ＤＯＮＥ  ┐\n┕━━━━━━━━━━━━━━━┙\n\n■ [ مـعـلـومـات الـفـيـديـو ]\n▸ العنوان: ${title.substring(0, 50)}${title.length > 50 ? "..." : ""}\n▸ الحجم: ${fileSizeMB} MB\n\n┌━━━━━━━━━━━━━━━┐\n┕  ＤＥＶ BY ＳＩＮＫＯ  ┙`,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(msg, threadID, (err) => {
        if (!err) api.setMessageReaction("✅", messageID, () => {}, true);
        
        // حذف الملف بعد الإرسال فوراً لتوفير مساحة Render
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, messageID);

      console.log(chalk.cyan(`[AutoDL] تم الإرسال بواسطة سينكو في المجموعة: ${threadID}`));

    } catch (error) {
      console.log(chalk.red(`[AutoDL Error] ${error.message}`));
      // في ملف الأحداث يفضل عدم إرسال رسائل خطأ لكل رابط عشان البوت ما يصير مزعج
    }
  }
};
