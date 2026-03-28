const chalk = require("chalk");

module.exports.config = {
  name: "حذف",
  aliases: ["unsend", "حذف", "مسح"],
  version: "1.0",
  author: "سينكو",
  countDown: 2,
  adminOnly: false,
  description: "سحب رسائل البوت عن طريق الرد عليها (Reply)",
  category: "نظام",
  guide: "قم بالرد على رسالة البوت واكتب {pn}",
  usePrefix: true
};

module.exports.run = function ({ api, event }) {
  const { threadID, messageID, type, messageReply } = event;
  const botID = api.getCurrentUserID();

  // التحقق من وجود رد على رسالة
  if (type !== "message_reply") {
    return api.sendMessage("⚠️ يرجى الرد على الرسالة التي تريد سحبها.", threadID, messageID);
  }

  // التحقق من أن الرسالة تخص البوت
  if (messageReply.senderID !== botID) {
    return api.sendMessage(" ، فقط رسائلي.", threadID, messageID);
  }

  // تنفيذ عملية السحب
  return api.unsendMessage(messageReply.messageID, (err) => {
    if (err) {
      console.log(chalk.red(`[خطأ سحب] فشل السحب: ${err}`));
      api.sendMessage("⚠️ حدث خطأ أثناء محاولة سحب الرسالة.", threadID, messageID);
    } else {
      console.log(chalk.green(`[سحب] تم سحب الرسالة بنجاح بواسطة سينكو.`));
    }
  });
};
