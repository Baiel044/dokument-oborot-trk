const MAX_MESSAGE_TEXT_LENGTH = 5000;
const MAX_MESSAGE_SUBJECT_LENGTH = 200;

/**
 * Validates chat input from REST and WebSocket alike.
 * Returns { text, subject } or { error } with a user-facing message.
 */
function normalizeMessageInput({ text, subject }, defaultSubject) {
  if (typeof text !== "string" || (subject !== undefined && subject !== null && typeof subject !== "string")) {
    return { error: "Кабардын тексти туура эмес форматта." };
  }

  const normalizedText = text.trim();
  const normalizedSubject = String(subject || "").trim() || defaultSubject;

  if (!normalizedText) {
    return { error: "Кабардын текстин жазыңыз." };
  }
  if (normalizedText.length > MAX_MESSAGE_TEXT_LENGTH) {
    return { error: `Кабар ${MAX_MESSAGE_TEXT_LENGTH} белгиден ашпашы керек.` };
  }
  if (normalizedSubject.length > MAX_MESSAGE_SUBJECT_LENGTH) {
    return { error: `Тема ${MAX_MESSAGE_SUBJECT_LENGTH} белгиден ашпашы керек.` };
  }

  return { text: normalizedText, subject: normalizedSubject };
}

module.exports = {
  MAX_MESSAGE_TEXT_LENGTH,
  MAX_MESSAGE_SUBJECT_LENGTH,
  normalizeMessageInput,
};
