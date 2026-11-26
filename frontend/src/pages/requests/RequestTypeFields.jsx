import { Plus, Trash2 } from "lucide-react";

// Used only when the server has not sent the field rules yet: the dates stay visible as before.
const FALLBACK_FIELDS = ["period"];

export function emptyItem() {
  return { name: "", quantity: "", price: "" };
}

/** Extra fields of a request type: "period", "amount", "items", "trip". */
export function getTypeFields(typeFields, type) {
  if (!typeFields) {
    return FALLBACK_FIELDS;
  }
  return typeFields[type] || [];
}

/** "12,5" and "12.5" are both accepted; anything else is NaN. */
export function parseNumber(value) {
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

/** 1234567.5 → "1 234 567,50"; whole sums have no decimals. */
export function formatMoney(amount) {
  const value = Number(amount) || 0;
  const [whole, fraction] = value.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction === "00" ? grouped : `${grouped},${fraction}`;
}

function itemsTotal(items) {
  return items.reduce((sum, item) => {
    const line = parseNumber(item.quantity) * parseNumber(item.price);
    return Number.isFinite(line) ? sum + line : sum;
  }, 0);
}

/** Checks the type-specific fields the same way the server does. */
export function validateTypeFields(fields, values, t) {
  const errors = {};
  if (fields.includes("period") && values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = t("requests.invalidDates");
  }
  if (fields.includes("items")) {
    const valid =
      values.items.length > 0 &&
      values.items.every(
        (item) => item.name.trim() && parseNumber(item.quantity) > 0 && parseNumber(item.price) >= 0
      );
    if (!valid) {
      errors.items = t("requests.itemsRequired");
    }
  } else if (fields.includes("amount") && !(parseNumber(values.amount) > 0)) {
    errors.amount = t("requests.amountRequired");
  }
  if (fields.includes("trip")) {
    if (!values.destination.trim()) {
      errors.destination = t("requests.destinationRequired");
    }
    if (!values.purpose.trim()) {
      errors.purpose = t("requests.purposeRequired");
    }
  }
  return errors;
}

/** Adds the type-specific fields to a request form payload. */
export function appendTypeFields(payload, fields, values) {
  if (fields.includes("period")) {
    payload.append("startDate", values.startDate);
    payload.append("endDate", values.endDate);
    payload.append("absenceTime", values.absenceTime.trim());
  }
  if (fields.includes("items")) {
    payload.append(
      "items",
      JSON.stringify(values.items.map((item) => ({ name: item.name.trim(), quantity: item.quantity, price: item.price })))
    );
  } else if (fields.includes("amount")) {
    payload.append("amount", values.amount);
  }
  if (fields.includes("trip")) {
    payload.append("destination", values.destination.trim());
    payload.append("purpose", values.purpose.trim());
  }
}

function FieldError({ message }) {
  return message ? <span className="field-error-text">{message}</span> : null;
}

/** Form fields that depend on the request type. Rendered straight into the form grid. */
export function RequestTypeFields({ fields, values, errors, onChange, t, fullWidthClass }) {
  function updateItem(index, name, value) {
    onChange(
      "items",
      values.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [name]: value } : item))
    );
  }

  return (
    <>
      {fields.includes("period") ? (
        <>
          <label>
            {t("requests.startDate")}
            <input type="date" value={values.startDate} onChange={(event) => onChange("startDate", event.target.value)} />
          </label>
          <label>
            {t("requests.endDate")}
            <input
              className={errors.endDate ? "input-error" : ""}
              type="date"
              value={values.endDate}
              onChange={(event) => onChange("endDate", event.target.value)}
            />
            <FieldError message={errors.endDate} />
          </label>
          <label>
            {t("requests.absenceTime")}
            <input value={values.absenceTime} onChange={(event) => onChange("absenceTime", event.target.value)} />
          </label>
        </>
      ) : null}

      {fields.includes("trip") ? (
        <>
          <label>
            {t("requests.destination")}
            <input
              className={errors.destination ? "input-error" : ""}
              value={values.destination}
              onChange={(event) => onChange("destination", event.target.value)}
              placeholder={t("requests.destinationPlaceholder")}
            />
            <FieldError message={errors.destination} />
          </label>
          <label>
            {t("requests.purpose")}
            <input
              className={errors.purpose ? "input-error" : ""}
              value={values.purpose}
              onChange={(event) => onChange("purpose", event.target.value)}
              placeholder={t("requests.purposePlaceholder")}
            />
            <FieldError message={errors.purpose} />
          </label>
        </>
      ) : null}

      {fields.includes("amount") && !fields.includes("items") ? (
        <label>
          {t("requests.amount")}
          <input
            className={errors.amount ? "input-error" : ""}
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => onChange("amount", event.target.value)}
            placeholder="5000"
          />
          <FieldError message={errors.amount} />
        </label>
      ) : null}

      {fields.includes("items") ? (
        <div className={`${fullWidthClass} request-items`}>
          <span className="request-items__title">{t("requests.items")}</span>
          <div className="request-items__table" role="table">
            <div className="request-items__row request-items__row--head" role="row">
              <span role="columnheader">№</span>
              <span role="columnheader">{t("requests.itemName")}</span>
              <span role="columnheader">{t("requests.itemQuantity")}</span>
              <span role="columnheader">{t("requests.itemPrice")}</span>
              <span role="columnheader">{t("requests.itemTotal")}</span>
              <span />
            </div>
            {values.items.map((item, index) => {
              const line = parseNumber(item.quantity) * parseNumber(item.price);
              return (
                <div className="request-items__row" role="row" key={index}>
                  <span role="cell">{index + 1}</span>
                  <input
                    aria-label={`${t("requests.itemName")} ${index + 1}`}
                    value={item.name}
                    onChange={(event) => updateItem(index, "name", event.target.value)}
                  />
                  <input
                    aria-label={`${t("requests.itemQuantity")} ${index + 1}`}
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  />
                  <input
                    aria-label={`${t("requests.itemPrice")} ${index + 1}`}
                    inputMode="decimal"
                    value={item.price}
                    onChange={(event) => updateItem(index, "price", event.target.value)}
                  />
                  <span role="cell" className="request-items__money">
                    {Number.isFinite(line) ? formatMoney(line) : "—"}
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${t("requests.removeItem")} ${index + 1}`}
                    title={t("requests.removeItem")}
                    disabled={values.items.length === 1}
                    onClick={() => onChange("items", values.items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <div className="request-items__row request-items__row--total" role="row">
              <span role="cell">{t("requests.itemsTotal")}</span>
              <span role="cell" className="request-items__money">
                {formatMoney(itemsTotal(values.items))}
              </span>
            </div>
          </div>
          <button
            className="ghost-button request-items__add"
            type="button"
            onClick={() => onChange("items", [...values.items, emptyItem()])}
          >
            <Plus size={16} aria-hidden="true" />
            {t("requests.addItem")}
          </button>
          <FieldError message={errors.items} />
        </div>
      ) : null}
    </>
  );
}

/** Read-only view of the type-specific fields in a request card. */
export function RequestTypeSummary({ item, fields, t }) {
  const hasTrip = fields.includes("trip") && (item.destination || item.purpose);
  const hasItems = fields.includes("items") && item.items?.length > 0;
  const hasAmount = fields.includes("amount") && typeof item.amount === "number";
  if (!hasTrip && !hasItems && !hasAmount) {
    return null;
  }

  return (
    <div className="request-type-summary">
      {hasTrip ? (
        <dl>
          <div>
            <dt>{t("requests.destination")}</dt>
            <dd>{item.destination}</dd>
          </div>
          <div>
            <dt>{t("requests.purpose")}</dt>
            <dd>{item.purpose}</dd>
          </div>
        </dl>
      ) : null}
      {hasItems ? (
        <table className="request-items-view">
          <thead>
            <tr>
              <th>№</th>
              <th>{t("requests.itemName")}</th>
              <th>{t("requests.itemQuantity")}</th>
              <th>{t("requests.itemPrice")}</th>
              <th>{t("requests.itemTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {item.items.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{formatMoney(row.quantity)}</td>
                <td>{formatMoney(row.price)}</td>
                <td>{formatMoney(row.quantity * row.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>{t("requests.itemsTotal")}</td>
              <td>{formatMoney(item.amount)}</td>
            </tr>
          </tfoot>
        </table>
      ) : null}
      {hasAmount ? (
        <p className="request-type-summary__amount">
          <strong>{t("requests.amountLabel")}:</strong> {item.amountText || `${formatMoney(item.amount)} сом`}
        </p>
      ) : null}
    </div>
  );
}
