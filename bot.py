import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)
from meetings import MeetingManager

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

meeting_manager = MeetingManager()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "שלום! אני העוזר האישי שלך 🤖\n\n"
        "אני יכול לעזור לך עם:\n"
        "📅 /פגישה - קביעת פגישה חדשה\n"
        "📋 /רשימה - הצגת כל הפגישות\n"
        "❌ /מחק - מחיקת פגישה\n"
        "❓ /עזרה - הצגת עזרה\n\n"
        "אפשר גם פשוט לכתוב לי בשפה חופשית!"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "📖 *הוראות שימוש:*\n\n"
        "*קביעת פגישה:*\n"
        "כתוב: `פגישה עם דני ב-25/03 בשעה 14:00`\n"
        "או השתמש בפקודה /פגישה\n\n"
        "*הצגת פגישות:*\n"
        "כתוב: `מה הפגישות שלי?` או /רשימה\n\n"
        "*מחיקת פגישה:*\n"
        "כתוב: `מחק פגישה 1` או /מחק",
        parse_mode="Markdown",
    )


async def new_meeting_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.args:
        text = " ".join(context.args)
        await handle_meeting_creation(update, text)
    else:
        await update.message.reply_text(
            "📅 *קביעת פגישה חדשה*\n\n"
            "אנא שלח את פרטי הפגישה בפורמט:\n"
            "`כותרת | תאריך | שעה | תיאור (אופציונלי)`\n\n"
            "לדוגמה:\n"
            "`פגישת עבודה | 25/03/2026 | 14:00 | עם הצוות`",
            parse_mode="Markdown",
        )
        context.user_data["waiting_for_meeting"] = True


async def list_meetings(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    meetings = meeting_manager.get_all_meetings()
    if not meetings:
        await update.message.reply_text("📭 אין לך פגישות קבועות כרגע.")
        return

    msg = "📋 *הפגישות שלך:*\n\n"
    for i, m in enumerate(meetings, 1):
        msg += (
            f"*{i}.* {m['title']}\n"
            f"   📅 {m['date']} בשעה {m['time']}\n"
        )
        if m.get("description"):
            msg += f"   📝 {m['description']}\n"
        msg += "\n"

    await update.message.reply_text(msg, parse_mode="Markdown")


async def delete_meeting(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        meetings = meeting_manager.get_all_meetings()
        if not meetings:
            await update.message.reply_text("אין פגישות למחיקה.")
            return
        msg = "🗑️ *איזו פגישה למחוק?*\n\nשלח את מספר הפגישה:\n\n"
        for i, m in enumerate(meetings, 1):
            msg += f"*{i}.* {m['title']} - {m['date']} {m['time']}\n"
        await update.message.reply_text(msg, parse_mode="Markdown")
        context.user_data["waiting_for_delete"] = True
        return

    try:
        idx = int(context.args[0]) - 1
        deleted = meeting_manager.delete_meeting(idx)
        if deleted:
            await update.message.reply_text(f"✅ הפגישה '{deleted['title']}' נמחקה בהצלחה.")
        else:
            await update.message.reply_text("❌ לא נמצאה פגישה עם המספר הזה.")
    except ValueError:
        await update.message.reply_text("❌ אנא שלח מספר תקין.")


async def handle_meeting_creation(update: Update, text: str) -> None:
    parts = [p.strip() for p in text.split("|")]
    if len(parts) >= 3:
        title = parts[0]
        date = parts[1]
        time = parts[2]
        description = parts[3] if len(parts) > 3 else ""
        meeting = meeting_manager.add_meeting(title, date, time, description)
        await update.message.reply_text(
            f"✅ *הפגישה נקבעה בהצלחה!*\n\n"
            f"📌 *כותרת:* {meeting['title']}\n"
            f"📅 *תאריך:* {meeting['date']}\n"
            f"⏰ *שעה:* {meeting['time']}\n"
            + (f"📝 *תיאור:* {meeting['description']}\n" if meeting.get("description") else ""),
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text(
            "❌ לא הצלחתי להבין את פרטי הפגישה.\n\n"
            "אנא שלח בפורמט:\n"
            "`כותרת | תאריך | שעה | תיאור`\n\n"
            "לדוגמה:\n"
            "`פגישת עבודה | 25/03/2026 | 14:00 | עם הצוות`",
            parse_mode="Markdown",
        )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text.strip()
    logger.info(f"Received message: {text}")

    # Handle waiting states
    if context.user_data.get("waiting_for_meeting"):
        context.user_data["waiting_for_meeting"] = False
        await handle_meeting_creation(update, text)
        return

    if context.user_data.get("waiting_for_delete"):
        context.user_data["waiting_for_delete"] = False
        try:
            idx = int(text) - 1
            deleted = meeting_manager.delete_meeting(idx)
            if deleted:
                await update.message.reply_text(f"✅ הפגישה '{deleted['title']}' נמחקה בהצלחה.")
            else:
                await update.message.reply_text("❌ לא נמצאה פגישה עם המספר הזה.")
        except ValueError:
            await update.message.reply_text("❌ אנא שלח מספר תקין.")
        return

    # Natural language detection
    lower = text.lower()

    meeting_keywords = ["פגישה", "מיטינג", "פגוש", "קבע", "נפגש", "תזמן", "schedule", "meeting"]
    list_keywords = ["רשימה", "הצג", "כל הפגישות", "מה הפגישות", "מתי", "list", "show"]
    delete_keywords = ["מחק", "בטל", "הסר", "delete", "cancel", "remove"]

    if any(kw in lower for kw in list_keywords):
        await list_meetings(update, context)
    elif any(kw in lower for kw in delete_keywords):
        await delete_meeting(update, context)
    elif any(kw in lower for kw in meeting_keywords):
        if "|" in text:
            await handle_meeting_creation(update, text)
        else:
            await update.message.reply_text(
                "📅 *קביעת פגישה*\n\n"
                "שלח את פרטי הפגישה בפורמט:\n"
                "`כותרת | תאריך | שעה | תיאור (אופציונלי)`\n\n"
                "לדוגמה:\n"
                "`פגישת עבודה | 25/03/2026 | 14:00 | עם הצוות`",
                parse_mode="Markdown",
            )
            context.user_data["waiting_for_meeting"] = True
    else:
        await update.message.reply_text(
            f"קיבלתי את ההודעה שלך! 👋\n\n"
            f"לא הצלחתי להבין את הבקשה. נסה:\n"
            f"• לכתוב 'פגישה' לקביעת פגישה\n"
            f"• לכתוב 'רשימה' לראות את הפגישות\n"
            f"• /עזרה לרשימת כל הפקודות"
        )


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error(f"Exception while handling an update: {context.error}", exc_info=context.error)
    if isinstance(update, Update) and update.message:
        await update.message.reply_text(
            "⚠️ אירעה שגיאה. אנא נסה שוב מאוחר יותר."
        )


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN לא הוגדר בקובץ .env")

    app = Application.builder().token(token).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("עזרה", help_command))
    app.add_handler(CommandHandler("פגישה", new_meeting_command))
    app.add_handler(CommandHandler("רשימה", list_meetings))
    app.add_handler(CommandHandler("מחק", delete_meeting))

    # Handle all text messages
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    app.add_error_handler(error_handler)

    logger.info("הבוט מתחיל לרוץ...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
