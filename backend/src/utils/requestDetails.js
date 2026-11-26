const { REQUEST_TYPE_FIELDS } = require("./catalogs");

const MAX_ITEMS = 50;
const MAX_AMOUNT = 1e9;
const MAX_TEXT = 300;

/** Extra fields of a request type: "period", "amount", "items", "trip". */
function getRequestFields(type) {
  return REQUEST_TYPE_FIELDS[String(type || "").trim()] || [];
}

/** "12,5" and "12.5" are both accepted. Returns NaN for anything that is not a number. */
function parseNumber(value) {
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function parseItems(rawItems) {
  let items = rawItems;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) {
    return null;
  }

  const parsed = items.map((item) => ({
    name: String(item?.name || "").trim().slice(0, MAX_TEXT),
    quantity: parseNumber(item?.quantity),
    price: parseNumber(item?.price),
  }));
  const valid = parsed.every((item) => item.name && item.quantity > 0 && item.price >= 0);
  return valid ? parsed : null;
}

/**
 * Reads the type-specific fields of a request from a form body.
 * Fields the type does not use are cleared, so a request never keeps data of another type.
 * Returns { values } or { message } with the error to show.
 */
function parseRequestDetails(type, body = {}) {
  const fields = getRequestFields(type);
  const values = {
    startDate: "",
    endDate: "",
    absenceTime: "",
    amount: null,
    items: [],
    destination: "",
    purpose: "",
  };

  if (fields.includes("period")) {
    values.startDate = String(body.startDate || "").trim();
    values.endDate = String(body.endDate || "").trim() || values.startDate;
    values.absenceTime = String(body.absenceTime || "").trim();
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      return { message: "Аяктоо күнү башталыш күндөн эрте боло албайт." };
    }
  }

  if (fields.includes("items")) {
    const items = parseItems(body.items);
    if (!items) {
      return { message: "Ар бир буюмдун аталышын, санын жана баасын толтуруңуз." };
    }
    values.items = items;
    values.amount = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  } else if (fields.includes("amount")) {
    const amount = parseNumber(body.amount);
    if (!(amount > 0) || amount > MAX_AMOUNT) {
      return { message: "Сумманы туура жазыңыз: нөлдөн чоң сан." };
    }
    values.amount = roundMoney(amount);
  }

  if (fields.includes("trip")) {
    values.destination = String(body.destination || "").trim().slice(0, MAX_TEXT);
    values.purpose = String(body.purpose || "").trim().slice(0, MAX_TEXT);
    if (!values.destination) {
      return { message: "Иш сапарга кайда бараарыңызды жазыңыз." };
    }
    if (!values.purpose) {
      return { message: "Иш сапардын максатын жазыңыз." };
    }
  }

  return { values };
}

module.exports = { getRequestFields, parseRequestDetails };
