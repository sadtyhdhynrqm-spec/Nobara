const chalk = require('chalk');

module.exports.config = {
  name: "الاوامر",
  aliases: ["help", "commands", "cmd"],
  version: "1.0",
  author: "سينكو",
  countDown: 5,
  adminOnly: false,
  description: "عرض قائمة الأوامر أو تفاصيل أمر معين",
  category: "نظام",
  guide: "{pn} [اسم الأمر] - اتركها فارغة لرؤية الكل",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID, senderID } = event;
  const commands = new Map(global.commands);
  const prefix = config.prefix;

  try {
    if (!args.length) {
      let msg = `┌  ＮＯＢＡＲＡ • ＭＥＮＵ  ┐\n┕━━━━━━━━━━━━━━━┙\n\n`;

      const categories = {};
      for (const [name, value] of commands) {
        if (value.config.adminOnly && !config.adminUIDs.includes(senderID)) continue;
        const category = value.config.category || "عام";
        categories[category] = categories[category] || { commands: [] };
        categories[category].commands.push(name);
      }

      Object.keys(categories).sort().forEach((category) => {
        msg += `■ [ ${category.toUpperCase()} ]\n`;
        msg += `▸ ${categories[category].commands.sort().join(" ✧ ")}\n\n`;
      });

      msg += `┌━━━━━━━━━━━━━━━┐\n`;
      msg += `▸ إجمالي الأوامر: [ ${commands.size} ]\n`;
      msg += `▸ البادئة: [ ${prefix} ]\n`;
      msg += `▸ المطور: سـيـنـكـو\n`;
      msg += `┕━━━━━━━━━━━━━━━┙\n\n`;
      msg += `『 ${prefix}الاوامر + اسم الأمر للتفاصيل 』`;

      api.sendMessage(msg, threadID, messageID);
      console.log(chalk.cyan(`[Help] تم طلب قائمة الأوامر | المجموعة: ${threadID}`));
    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get([...commands].find(([_, v]) => v.config.aliases?.includes(commandName))?.[0]);

      if (!command) {
        api.sendMessage(`❌ الأمر "${commandName}" غير موجود.`, threadID, messageID);
        return;
      }

      const c = command.config;
      const usage = c.guide?.replace(/{pn}/g, `${prefix}${c.name}`) || `${prefix}${c.name}`;

      const res = `
┌  ＮＯＢＡＲＡ • ＩＮＦＯ  ┐
┕━━━━━━━━━━━━━━━┙

■ [ مـعـلـومـات الـمـهـمـة ]
▸ الاسم: ${c.name}
▸ الوصف: ${c.description}
▸ الاختصارات: ${c.aliases?.join(", ") || "لا يوجد"}
▸ الانتظار: ${c.countDown || 1} ثانية
▸ الفئة: ${c.category || "عام"}

■ [ طـريـقـة الاسـتـخـدام ]
▸ ${usage}

┌━━━━━━━━━━━━━━━┐
┕  ＤＥＶ BY ＳＩＮＫＯ  ┙`.trim();

      api.sendMessage(res, threadID, messageID);
    }
  } catch (err) {
    console.log(chalk.red(`[Help Error] ${err.message}`));
    api.sendMessage("❌ حدث خطأ في معالج الأوامر.", threadID, messageID);
  }
};
