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
  "Долбоор",
  "Директор карап жатат",
  "Директор кол койду",
  "Кадрлар бөлүмүнө жөнөтүлдү",
  "Бухгалтерияга жөнөтүлдү",
  "Окутуучуга кайтарылды",
  "Четке кагылды",
];

const DOCUMENT_CATEGORIES = ["orders", "statements", "reports"];

const REQUEST_STATUS_ALIASES = {
  Черновик: "Долбоор",
  Долбоор: "Долбоор",
  Отправлено: "Директор карап жатат",
  "На рассмотрении": "Директор карап жатат",
  "На рассмотрении директора": "Директор карап жатат",
  "Директор карап жатат": "Директор карап жатат",
  Одобрено: "Директор кол койду",
  "Подписано директором": "Директор кол койду",
  "Директор кол койду": "Директор кол койду",
  "Направлено в отдел кадров": "Кадрлар бөлүмүнө жөнөтүлдү",
  "Кадрлар бөлүмүнө жөнөтүлдү": "Кадрлар бөлүмүнө жөнөтүлдү",
  "Направлено в бухгалтерию": "Бухгалтерияга жөнөтүлдү",
  "Бухгалтерияга жөнөтүлдү": "Бухгалтерияга жөнөтүлдү",
  "Возвращено преподавателю": "Окутуучуга кайтарылды",
  "Возвращено на доработку": "Окутуучуга кайтарылды",
  "Окутуучуга кайтарылды": "Окутуучуга кайтарылды",
  Отклонено: "Четке кагылды",
  "Четке кагылды": "Четке кагылды",
};

function normalizeRequestStatus(status) {
  return REQUEST_STATUS_ALIASES[status] || status;
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
  normalizeRequestStatus,
  getRoleTitle,
  getDepartmentTitle,
};
