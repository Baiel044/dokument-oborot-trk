const ROLES = [
  { code: "TEACHER", title: "Окутуучу" },
  { code: "DIRECTOR", title: "Директор" },
  { code: "ACADEMIC_OFFICE", title: "Окуу бөлүмү" },
  { code: "HR", title: "Кадрлар бөлүмү" },
  { code: "ACCOUNTANT", title: "Бухгалтерия" },
  { code: "ADMIN", title: "Тутум администратору" },
];

const DEPARTMENTS = [
  { id: "general", title: "Жалпы администрация" },
  { id: "teaching", title: "Окутуучулар курамы" },
  { id: "academic-office", title: "Окуу бөлүмү" },
  { id: "hr", title: "Кадрлар бөлүмү" },
  { id: "accounting", title: "Бухгалтерия" },
  { id: "it", title: "IT бөлүмү" },
];

const REQUEST_TYPES = [
  "Жумуштан суранып чыгуу",
  "Өргүүгө арыз",
  "Сабакты алмаштырууга арыз",
  "Кызматтык кат",
  "Жүйөлүү себеп боюнча арыз",
];

const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "pending",
  "approved",
  "returned",
  "rejected",
  "completed",
  "Долбоор",
  "Директор карап жатат",
  "Директор кол койду",
  "Окуу бөлүмүнө жөнөтүлдү",
  "Кадрлар бөлүмүнө жөнөтүлдү",
  "Бухгалтерияга жөнөтүлдү",
  "Окутуучуга кайтарылды",
  "Четке кагылды",
  "Аткарылды",
];

const DOCUMENT_CATEGORIES = ["statements", "orders", "certificates", "incoming", "outgoing", "reports"];

const DOCUMENT_CATEGORY_ALIASES = {
  application: "statements",
  applications: "statements",
  statement: "statements",
  statements: "statements",
  order: "orders",
  orders: "orders",
  certificate: "certificates",
  certificates: "certificates",
  incoming: "incoming",
  outgoing: "outgoing",
  report: "reports",
  reports: "reports",
  "Отчёт": "reports",
  "Отчет": "reports",
  "Отчеты": "reports",
  "Отчёты": "reports",
};

const REQUEST_STATUS_ALIASES = {
  draft: "Долбоор",
  DRAFT: "Долбоор",
  Черновик: "Долбоор",
  Долбоор: "Долбоор",
  submitted: "Директор карап жатат",
  SUBMITTED: "Директор карап жатат",
  pending: "Директор карап жатат",
  PENDING: "Директор карап жатат",
  Жөнөтүлдү: "Директор карап жатат",
  Отправлено: "Директор карап жатат",
  Күтүүдө: "Директор карап жатат",
  "На рассмотрении": "Директор карап жатат",
  "На рассмотрении директора": "Директор карап жатат",
  "Директор карап жатат": "Директор карап жатат",
  approved: "Директор кол койду",
  APPROVED: "Директор кол койду",
  Одобрено: "Директор кол койду",
  "Подписано директором": "Директор кол койду",
  "Директор кол койду": "Директор кол койду",
  "Направлено в учебную часть": "Окуу бөлүмүнө жөнөтүлдү",
  "Окуу бөлүмүнө жөнөтүлдү": "Окуу бөлүмүнө жөнөтүлдү",
  "Направлено в отдел кадров": "Кадрлар бөлүмүнө жөнөтүлдү",
  "Кадрлар бөлүмүнө жөнөтүлдү": "Кадрлар бөлүмүнө жөнөтүлдү",
  "Направлено в бухгалтерию": "Бухгалтерияга жөнөтүлдү",
  "Бухгалтерияга жөнөтүлдү": "Бухгалтерияга жөнөтүлдү",
  "Возвращено преподавателю": "Окутуучуга кайтарылды",
  "Возвращено на доработку": "Окутуучуга кайтарылды",
  Возвращено: "Окутуучуга кайтарылды",
  Кайтарылды: "Окутуучуга кайтарылды",
  "Окутуучуга кайтарылды": "Окутуучуга кайтарылды",
  returned: "Окутуучуга кайтарылды",
  RETURNED: "Окутуучуга кайтарылды",
  rejected: "Четке кагылды",
  REJECTED: "Четке кагылды",
  Отклонено: "Четке кагылды",
  "Четке кагылды": "Четке кагылды",
  completed: "Аткарылды",
  COMPLETED: "Аткарылды",
  Исполнено: "Аткарылды",
  Завершено: "Аткарылды",
  Аткарылды: "Аткарылды",
};

function normalizeRequestStatus(status) {
  const value = String(status || "").trim();
  if (!value) {
    return "";
  }

  return REQUEST_STATUS_ALIASES[value] || REQUEST_STATUS_ALIASES[value.toLowerCase()] || value;
}

function normalizeDocumentCategory(category) {
  const value = String(category || "").trim();
  if (!value) {
    return "";
  }

  return DOCUMENT_CATEGORY_ALIASES[value] || DOCUMENT_CATEGORY_ALIASES[value.toLowerCase()] || "";
}

function getRoleTitle(code) {
  return ROLES.find((role) => role.code === code)?.title || code;
}

function getDepartmentTitle(id) {
  return DEPARTMENTS.find((department) => department.id === id)?.title || id;
}

module.exports = {
  ROLES,
  DEPARTMENTS,
  REQUEST_TYPES,
  REQUEST_STATUSES,
  DOCUMENT_CATEGORIES,
  normalizeDocumentCategory,
  normalizeRequestStatus,
  getRoleTitle,
  getDepartmentTitle,
};
