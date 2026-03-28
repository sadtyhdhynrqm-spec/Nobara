const axios = require('axios');

module.exports.config = {
  name: "اوامر",
  aliases: ["help", "menu", "أوامر"],
  version: "1.8",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "عرض قائمة المهام والعمليات المتاحة في النظام",
  category: "نظام",
  guide: "{pn} [اسم الأمر]",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID, senderID } = event;
  const commands = global.client.commands;
  const prefix = config.prefix;

  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);

    if (!args.length) {
      const categories = {};
      let totalCommands = 0;

      commands.forEach((value, name) => {
        if (value.config.adminOnly && !config.adminUIDs.includes(senderID)) return;
        const category = value.config.category || "عام";
        if (!categories[category]) categories[category] = [];
        categories[category].push(name);
        totalCommands++;
      });

      let msg = `┌  ＮＯＢＡＲＡ • ＭＥＮＵ  ┐\n┕━━━━━━━━━━━━━━━┙\n\n`;

      for (const category in categories) {
        msg += `■ [ ${category.toUpperCase()} ]\n`;
        msg += `▸ ${categories[category].join(" ✧ ")}\n\n`;
      }

      msg += `┌━━━━━━━━━━━━━━━┐\n`;
      msg += `▸ إجمالي الأوامر: [ ${totalCommands} ]\n`;
      msg += `▸ البادئة الحالية: [ ${prefix} ]\n`;
      msg += `▸ الحالة: متصل ونشط ⚡\n`;
      msg += `┕━━━━━━━━━━━━━━━┙\n\n`;
      msg += `『 لـلـتـفـاصـيـل: ${prefix}الاوامر + الاسم 』\n`;
      msg += `『 ＰＯＷＥＲＥＤ BY ＳＩＮＫＯ 』`;

      // رابط الـ GIF الخاص بنوبارا
      const gifUrl = "https://i.imgur.com/vHExIat.gif"; 
      const gifStream = await axios.get(gifUrl, { responseType: 'stream' }).then(res => res.data);

      return api.sendMessage({
        body: msg,
        attachment: gifStream
      }, threadID, () => api.setMessageReaction("👑", messageID, () => {}, true), messageID);

    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get([...commands].find(([_, v]) => v.config.aliases?.includes(commandName))?.[0]);

      if (!command) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("⚠️ هذا الأمر غير موجود في قاعدة بيانات نوبارا.", threadID, messageID);
      }

      const c = command.config;
      const usage = c.guide?.replace(/{pn}/g, `${prefix}${c.name}`) || `${prefix}${c.name}`;

      const res = `
┌  ＮＯＢＡＲＡ • ＩＮＦＯ  ┐
┕━━━━━━━━━━━━━━━┙

■ [ تـفـاصـيـل الـعـمـلـيـة ]
▸ الاسم: ${c.name}
▸ الوصف: ${c.description}
▸ الاختصارات: ${c.aliases?.join(", ") || "لا يوجد"}
▸ الانتظار: ${c.countDown} ثانية
▸ الفئة: ${c.category}

■ [ طـريـقـة الاسـتـخـدام ]
▸ ${usage}

┌━━━━━━━━━━━━━━━┐
┕  ＤＥＶ BY ＳＩＮＫＯ  ┙`.trim();

      api.sendMessage(res, threadID, () => api.setMessageReaction("ℹ️", messageID, () => {}, true), messageID);
    }
  } catch (err) {
    api.sendMessage("❌ فشل معالج الأوامر في التحميل.", threadID, messageID);
  }
};
