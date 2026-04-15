export const STORAGE_LANGUAGE_KEY = "eduflow-language";

export function getStoredLanguage() {
  const value = localStorage.getItem(STORAGE_LANGUAGE_KEY);
  return value === "ru" ? "ru" : "ky";
}

export const translations = {
  ky: {
    common: {
      loading: "Жүктөлүүдө...",
      logout: "Чыгуу",
      account: "Аккаунт",
      createRequest: "Арыз түзүү",
      chooseDepartment: "Бөлүмдү тандаңыз",
      chooseEmployee: "Кызматкерди тандаңыз",
      read: "Окулду",
      sent: "Жөнөтүлдү",
      noData: "Азырынча маалымат жок.",
      serverUnavailable: "Сервер жеткиликсиз. Backend иштеп турганын текшериңиз.",
      requestError: "Сурам катасы.",
      backToLogin: "Кирүү барагына кайтыңыз",
    },
    nav: {
      home: "Башкы бет",
      messages: "Кабарлар",
      requests: "Арыздар",
      documents: "Документтер",
      notifications: "Билдирмелер",
      profile: "Профиль",
      users: "Колдонуучулар",
      reports: "Отчёттор",
      admin: "Админ панель",
    },
    brand: {
      portal: "КОЛЛЕДЖ ПОРТАЛЫ",
      college: "Таш-Көмүр аймактык колледжи",
      description: "Ролдор, кабарлар, арыздар жана кызматтык документтер бир кабинетте.",
    },
    login: {
      title: "Таш-Көмүр аймактык колледжи",
      description:
        "Ички кабарлар, директорго арыздар, окуу бөлүмү, кадрлар жана бухгалтерия үчүн билдирмелер бирдиктүү санарип мейкиндикте.",
      signIn: "Кирүү",
      apply: "Арыз берүү",
      roles: "6 роль",
      rolesText: "Бөлүмдөр боюнча бирдиктүү жеткиликтүүлүк",
      onlineRequests: "Онлайн арыздар",
      onlineRequestsText: "Кагазсыз макулдашуу жана тез кароо",
      internalComms: "Ички байланыш",
      internalCommsText: "Кабарлар жана билдирмелер бир терезеде",
      caption: "Электрондук документ жүгүртүүнүн расмий системасы",
      loginOrEmail: "Логин же Email",
      loginPlaceholder: "Логинди же emailди жазыңыз",
      password: "Сырсөз",
      passwordPlaceholder: "Сырсөздү жазыңыз",
      loginHelp: "Эгер кирүү болбой жатса, төмөндөгү тесттик аккаунттардын бирин тандаңыз.",
      noAccount: "Аккаунтуңуз жокпу?",
      registerLink: "Катталууга арыз бериңиз",
      demoAccounts: "Тесттик аккаунттар",
      loggingIn: "Кирүүдө...",
      logoAlt: "Таш-Көмүр аймактык колледжинин логотиби",
      close: "Жабуу",
      admin: "Админ",
      director: "Директор",
      teacher: "Окутуучу",
    },
    register: {
      eyebrow: "Кызматкерлерди каттоо",
      title: "Ролу жана бөлүмү көрсөтүлгөн жеткиликтүүлүк арызын тапшырыңыз",
      description:
        "Арыз жөнөтүлгөндөн кийин аккаунтту директор же тутум администратору тастыктайт.",
      formTitle: "Катталуу арызы",
      fullName: "Аты-жөнү",
      email: "Email",
      phone: "Телефон",
      position: "Кызматы",
      department: "Бөлүм",
      role: "Ролу",
      username: "Логин",
      password: "Сырсөз",
      confirmPassword: "Сырсөздү ырастоо",
      submit: "Арыз жөнөтүү",
      submitting: "Жөнөтүлүүдө...",
      alreadyRegistered: "Мурда катталгансызбы?",
    },
    dashboard: {
      loading: "Кабинет жүктөлүүдө...",
      kicker: "Жеке кабинет",
      title: "Арыздар, кабарлар жана макулдашуулар үчүн бирдиктүү панель",
      description:
        "Кайрылуулардын абалын көзөмөлдөңүз, билдирмелерди текшериңиз жана аракет талап кылган документтерге тез өтүңүз.",
      myRequests: "Менин арыздарым",
      inboxMessages: "Кирген кабарлар",
      unreadNotifications: "Окулбаган билдирмелер",
      documents: "Тутумдагы документтер",
      recentRequests: "Акыркы арыздар",
      recentMessages: "Жаңы кабарлар",
      recentNotifications: "Билдирмелер",
      noRequests: "Арыздар жок",
      noRequestsText: "Азырынча системада түзүлгөн арыздар жок.",
      noMessages: "Кабарлар жок",
      noMessagesText: "Азырынча жаңы кирген кабарлар жок.",
      quiet: "Тынчтык",
      quietText: "Бардык окуялар иштелди.",
    },
    messages: {
      compose: "Жаңы кабар",
      history: "Жазышуу тарыхы",
      unread: "Окулбаган",
      receiver: "Алуучу",
      orDepartment: "Же бөлүм",
      subject: "Тема",
      text: "Текст",
      send: "Жөнөтүү",
      markRead: "Окулду",
      noMessages: "Кабарлар жок",
      noMessagesText: "Кызматкерге же бөлүмгө биринчи ички кабарды жөнөтүңүз.",
      subjectPlaceholder: "Теманы жазыңыз",
      textPlaceholder: "Кабар текстин жазыңыз",
    },
    requests: {
      titleTeacher: "Окутуучунун директорго кайрылуусу",
      type: "Кайрылуунун түрү",
      chooseType: "Түрүн тандаңыз",
      documentTitle: "Документтин аталышы",
      documentTitlePlaceholder: "Мисалы: кызматтык кат",
      startDate: "Башталыш күнү",
      endDate: "Аяктоо күнү",
      absenceTime: "Жок болгон убакыт",
      sendMode: "Жөнөтүү режими",
      draft: "Долбоор",
      directToDirector: "Дароо директорго",
      reason: "Кайрылуунун мазмуну",
      reasonPlaceholder: "Кайрылууну, тапшырманы же өтүнүчтү жазыңыз",
      comment: "Комментарий",
      commentPlaceholder: "Директор үчүн кошумча маалымат",
      attachment: "PDF / Word / Excel документ",
      send: "Кайрылуу жөнөтүү",
      success: "Кайрылуу директорго жөнөтүлдү.",
      fillRequired: "Белгиленген милдеттүү талааларды толтуруңуз.",
      typeRequired: "Кайрылуунун түрүн тандаңыз.",
      documentTitleRequired: "Документтин аталышын жазыңыз.",
      reasonRequired: "Кайрылуунун мазмунун жазыңыз.",
      invalidDates: "Аяктоо күнү башталыш күндөн эрте боло албайт.",
      directorPrompt: "Директордун комментарийи",
      signaturePrompt: "Директордун кол тамгасы",
      directorQueue: "Директор кол кое турган документтер",
      hrQueue: "Кадрлар бөлүмүнүн документтери",
      accountantQueue: "Бухгалтериянын документтери",
      myQueue: "Менин кайрылууларым",
      currentRecipient: "Учурдагы алуучу",
      directorComment: "Директордун комментарийи",
      signedBy: "Кол койгон",
      openAttachment: "Тиркемени ачуу",
      approve: "Бекитүү",
      officialBadge: "Расмий документ",
      officialPdf: "Расмий PDF",
      noDocuments: "Документтер азырынча жок",
      noDocumentsText:
        "Бул жерде окутуучулардын кайрылуусу жана директор кол койгон документтер көрүнөт.",
      routeHr: "Кадрлар бөлүмүнө",
      routeAccounting: "Бухгалтерияга",
      routeBack: "Окутуучуга кайтаруу",
    },
    documents: {
      uploadTitle: "Документ жүктөө",
      title: "Аталышы",
      category: "Категория",
      description: "Сүрөттөмө",
      file: "Файл",
      upload: "Жүктөө",
      archive: "Документтер архиви",
      openFile: "Файлды ачуу",
      noFile: "Файл жок",
      noDocuments: "Документтер азырынча жок",
      noDocumentsText: "Тутум архивине биринчи документти жүктөңүз.",
      defaultCategory: "Кызматтык документ",
    },
    notifications: {
      title: "Билдирмелер",
      noNotifications: "Билдирме жок",
      noNotificationsText: "Окуялар бул жерде системадагы аракеттерден кийин чыгат.",
    },
    profile: {
      title: "Кызматкердин профили",
      fullName: "Аты-жөнү",
      email: "Email",
      phone: "Телефон",
      username: "Логин",
      role: "Ролу",
      status: "Абалы",
    },
    users: {
      title: "Тутум колдонуучулары",
      approve: "Тастыктоо",
      noUsers: "Колдонуучулар жок",
      noUsersText: "Колдонуучулардын тизмеси азырынча бош.",
    },
    reports: {
      loading: "Отчёт түзүлүүдө...",
      documents: "Документтер",
      auditLogs: "Аудит жазуулары",
      requestStatuses: "Арыздардын абалдары",
      usersByRole: "Колдонуучулар ролдор боюнча",
      departments: "Бөлүмдөр",
    },
    admin: {
      pendingUsers: "Тастыктоону күтүп жаткандар",
      noPendingUsers: "Катталуу боюнча жаңы арыздар жок.",
      auditLog: "Аракеттер журналы",
    },
    route: {
      forbiddenLoading: "Жүктөлүүдө...",
    },
    statuses: {
      active: "Активдүү",
      pending: "Күтүүдө",
      blocked: "Бөгөттөлгөн",
    },
  },
  ru: {
    common: {
      loading: "Загрузка...",
      logout: "Выйти",
      account: "Аккаунт",
      createRequest: "Создать заявление",
      chooseDepartment: "Выберите отдел",
      chooseEmployee: "Выберите сотрудника",
      read: "Прочитано",
      sent: "Отправлено",
      noData: "Пока нет данных.",
      serverUnavailable: "Сервер недоступен. Проверьте, что backend запущен.",
      requestError: "Ошибка запроса.",
      backToLogin: "Вернуться ко входу",
    },
    nav: {
      home: "Главная",
      messages: "Сообщения",
      requests: "Заявления",
      documents: "Документы",
      notifications: "Уведомления",
      profile: "Профиль",
      users: "Пользователи",
      reports: "Отчёты",
      admin: "Админ-панель",
    },
    brand: {
      portal: "ПОРТАЛ КОЛЛЕДЖА",
      college: "Таш-Кумырский региональный колледж",
      description: "Роли, сообщения, заявления и служебные документы в одном кабинете.",
    },
    login: {
      title: "Таш-Кумырский региональный колледж",
      description:
        "Внутренние сообщения, заявления директору, уведомления для учебной части, кадров и бухгалтерии в едином цифровом контуре.",
      signIn: "Войти",
      apply: "Подать заявку",
      roles: "6 ролей",
      rolesText: "Единый доступ по отделам",
      onlineRequests: "Онлайн-заявления",
      onlineRequestsText: "Согласование без бумаги и быстрый просмотр",
      internalComms: "Внутренняя связь",
      internalCommsText: "Сообщения и уведомления в одном окне",
      caption: "Официальная система электронного документооборота",
      loginOrEmail: "Логин или Email",
      loginPlaceholder: "Введите логин или email",
      password: "Пароль",
      passwordPlaceholder: "Введите пароль",
      loginHelp: "Если вход не проходит, выберите один из тестовых аккаунтов ниже.",
      noAccount: "Нет аккаунта?",
      registerLink: "Подать заявку на регистрацию",
      demoAccounts: "Тестовые аккаунты",
      loggingIn: "Вход...",
      logoAlt: "Логотип Таш-Кумырского регионального колледжа",
      close: "Закрыть",
      admin: "Админ",
      director: "Директор",
      teacher: "Преподаватель",
    },
    register: {
      eyebrow: "Регистрация сотрудников",
      title: "Подайте заявку на доступ с указанием роли и подразделения",
      description:
        "После отправки заявки аккаунт подтверждает директор или системный администратор.",
      formTitle: "Заявка на регистрацию",
      fullName: "ФИО",
      email: "Email",
      phone: "Телефон",
      position: "Должность",
      department: "Подразделение",
      role: "Роль",
      username: "Логин",
      password: "Пароль",
      confirmPassword: "Подтверждение пароля",
      submit: "Отправить заявку",
      submitting: "Отправка...",
      alreadyRegistered: "Уже зарегистрированы?",
    },
    dashboard: {
      loading: "Загрузка кабинета...",
      kicker: "Личный кабинет",
      title: "Единая панель для заявлений, сообщений и согласований",
      description:
        "Следите за статусами обращений, проверяйте уведомления и быстро переходите к документам, которые требуют действий.",
      myRequests: "Мои заявления",
      inboxMessages: "Входящие сообщения",
      unreadNotifications: "Непрочитанные уведомления",
      documents: "Документы в системе",
      recentRequests: "Последние заявления",
      recentMessages: "Новые сообщения",
      recentNotifications: "Уведомления",
      noRequests: "Заявлений нет",
      noRequestsText: "Пока в системе нет созданных заявлений.",
      noMessages: "Сообщений нет",
      noMessagesText: "Пока нет новых входящих сообщений.",
      quiet: "Тишина",
      quietText: "Все события обработаны.",
    },
    messages: {
      compose: "Новое сообщение",
      history: "История переписки",
      unread: "Непрочитанных",
      receiver: "Получатель",
      orDepartment: "Или отдел",
      subject: "Тема",
      text: "Текст",
      send: "Отправить",
      markRead: "Прочитано",
      noMessages: "Сообщений нет",
      noMessagesText: "Отправьте первое внутреннее сообщение сотруднику или отделу.",
      subjectPlaceholder: "Введите тему",
      textPlaceholder: "Введите текст сообщения",
    },
    requests: {
      titleTeacher: "Обращение преподавателя директору",
      type: "Тип обращения",
      chooseType: "Выберите тип",
      documentTitle: "Название документа",
      documentTitlePlaceholder: "Например: служебная записка",
      startDate: "Дата начала",
      endDate: "Дата окончания",
      absenceTime: "Время отсутствия",
      sendMode: "Режим отправки",
      draft: "Черновик",
      directToDirector: "Сразу директору",
      reason: "Суть обращения",
      reasonPlaceholder: "Опишите обращение, задачу или просьбу",
      comment: "Комментарий",
      commentPlaceholder: "Дополнительная информация для директора",
      attachment: "Документ PDF / Word / Excel",
      send: "Отправить обращение",
      success: "Обращение отправлено директору.",
      fillRequired: "Заполните обязательные поля.",
      typeRequired: "Выберите тип обращения.",
      documentTitleRequired: "Введите название документа.",
      reasonRequired: "Введите суть обращения.",
      invalidDates: "Дата окончания не может быть раньше даты начала.",
      directorPrompt: "Комментарий директора",
      signaturePrompt: "Подпись директора",
      directorQueue: "Документы на подпись директора",
      hrQueue: "Документы отдела кадров",
      accountantQueue: "Документы бухгалтерии",
      myQueue: "Мои обращения",
      currentRecipient: "Текущий получатель",
      directorComment: "Комментарий директора",
      signedBy: "Подписал",
      openAttachment: "Открыть вложение",
      approve: "Одобрить",
      officialBadge: "Официальный документ",
      officialPdf: "Официальный PDF",
      noDocuments: "Документов пока нет",
      noDocumentsText:
        "Здесь будут отображаться обращения преподавателей и документы, подписанные директором.",
      routeHr: "В отдел кадров",
      routeAccounting: "В бухгалтерию",
      routeBack: "Вернуть преподавателю",
    },
    documents: {
      uploadTitle: "Загрузка документа",
      title: "Название",
      category: "Категория",
      description: "Описание",
      file: "Файл",
      supportedFormats: "Поддерживаются PDF, Word и Excel",
      upload: "Загрузить",
      archive: "Архив документов",
      openFile: "Открыть файл",
      noFile: "Файла нет",
      noDocuments: "Документов пока нет",
      noDocumentsText: "Загрузите первый документ в архив системы.",
      defaultCategory: "Служебный документ",
    },
    notifications: {
      title: "Уведомления",
      noNotifications: "Уведомлений нет",
      noNotificationsText: "События будут появляться здесь после действий в системе.",
    },
    profile: {
      title: "Профиль сотрудника",
      fullName: "ФИО",
      email: "Email",
      phone: "Телефон",
      username: "Логин",
      role: "Роль",
      status: "Статус",
    },
    users: {
      title: "Пользователи системы",
      approve: "Подтвердить",
      noUsers: "Пользователей нет",
      noUsersText: "Список пользователей пока пуст.",
    },
    reports: {
      loading: "Формирование отчёта...",
      documents: "Документы",
      auditLogs: "Аудит-записи",
      requestStatuses: "Статусы заявлений",
      usersByRole: "Пользователи по ролям",
      departments: "Подразделения",
    },
    admin: {
      pendingUsers: "Ожидают подтверждения",
      noPendingUsers: "Новых заявок на регистрацию нет.",
      auditLog: "Журнал действий",
    },
    route: {
      forbiddenLoading: "Загрузка...",
    },
    statuses: {
      active: "Активен",
      pending: "Ожидает",
      blocked: "Заблокирован",
    },
  },
};

function resolvePath(target, path) {
  return path
    .split(".")
    .reduce((result, key) => (result && result[key] !== undefined ? result[key] : undefined), target);
}

export function translate(language, path, fallback = path) {
  return resolvePath(translations[language] || translations.ky, path) ?? fallback;
}

const ROLE_TITLES = {
  TEACHER: { ky: "Окутуучу", ru: "Преподаватель" },
  DIRECTOR: { ky: "Директор", ru: "Директор" },
  ACADEMIC_OFFICE: { ky: "Окуу бөлүмү", ru: "Учебная часть" },
  HR: { ky: "Кадрлар бөлүмү", ru: "Отдел кадров" },
  ACCOUNTANT: { ky: "Бухгалтерия", ru: "Бухгалтерия" },
  ADMIN: { ky: "Тутум администратору", ru: "Системный администратор" },
};

const ROLE_ALIASES = {
  TEACHER: "TEACHER",
  Окутуучу: "TEACHER",
  Преподаватель: "TEACHER",
  DIRECTOR: "DIRECTOR",
  Директор: "DIRECTOR",
  ACADEMIC_OFFICE: "ACADEMIC_OFFICE",
  "Окуу бөлүмү": "ACADEMIC_OFFICE",
  "Учебная часть": "ACADEMIC_OFFICE",
  HR: "HR",
  "Кадрлар бөлүмү": "HR",
  "Отдел кадров": "HR",
  ACCOUNTANT: "ACCOUNTANT",
  Бухгалтерия: "ACCOUNTANT",
  ADMIN: "ADMIN",
  "Тутум администратору": "ADMIN",
  "Системный администратор": "ADMIN",
};

const DEPARTMENT_TITLES = {
  general: { ky: "Жалпы администрация", ru: "Общая администрация" },
  teaching: { ky: "Окутуучулар курамы", ru: "Преподавательский состав" },
  "academic-office": { ky: "Окуу бөлүмү", ru: "Учебная часть" },
  hr: { ky: "Кадрлар бөлүмү", ru: "Отдел кадров" },
  accounting: { ky: "Бухгалтерия", ru: "Бухгалтерия" },
  it: { ky: "IT бөлүмү", ru: "IT-отдел" },
};

const DEPARTMENT_ALIASES = {
  general: "general",
  "Жалпы администрация": "general",
  "Общая администрация": "general",
  teaching: "teaching",
  "Окутуучулар курамы": "teaching",
  "Преподавательский состав": "teaching",
  "academic-office": "academic-office",
  "Окуу бөлүмү": "academic-office",
  "Учебная часть": "academic-office",
  hr: "hr",
  "Кадрлар бөлүмү": "hr",
  "Отдел кадров": "hr",
  accounting: "accounting",
  Бухгалтерия: "accounting",
  it: "it",
  "IT бөлүмү": "it",
  "IT-отдел": "it",
};

const REQUEST_TYPE_TITLES = {
  "Жумуштан суранып чыгуу": { ky: "Жумуштан суранып чыгуу", ru: "Отпроситься с работы" },
  "Өргүүгө арыз": { ky: "Өргүүгө арыз", ru: "Заявление на отпуск" },
  "Сабакты алмаштырууга арыз": { ky: "Сабакты алмаштырууга арыз", ru: "Заявление на замену занятий" },
  "Кызматтык кат": { ky: "Кызматтык кат", ru: "Служебная записка" },
  "Жүйөлүү себеп боюнча арыз": { ky: "Жүйөлүү себеп боюнча арыз", ru: "Заявление по уважительной причине" },
  "Отпроситься с работы": { ky: "Жумуштан суранып чыгуу", ru: "Отпроситься с работы" },
  "Заявление на отпуск": { ky: "Өргүүгө арыз", ru: "Заявление на отпуск" },
  "Заявление на замену занятий": { ky: "Сабакты алмаштырууга арыз", ru: "Заявление на замену занятий" },
  "Служебная записка": { ky: "Кызматтык кат", ru: "Служебная записка" },
  "Заявление по уважительной причине": { ky: "Жүйөлүү себеп боюнча арыз", ru: "Заявление по уважительной причине" },
};

const REQUEST_STATUS_TITLES = {
  Долбоор: { ky: "Долбоор", ru: "Черновик" },
  Черновик: { ky: "Долбоор", ru: "Черновик" },
  "Директор карап жатат": { ky: "Директор карап жатат", ru: "На рассмотрении директора" },
  Отправлено: { ky: "Директор карап жатат", ru: "На рассмотрении директора" },
  "На рассмотрении": { ky: "Директор карап жатат", ru: "На рассмотрении директора" },
  "На рассмотрении директора": { ky: "Директор карап жатат", ru: "На рассмотрении директора" },
  "Директор кол койду": { ky: "Директор кол койду", ru: "Подписано директором" },
  Одобрено: { ky: "Директор кол койду", ru: "Подписано директором" },
  "Подписано директором": { ky: "Директор кол койду", ru: "Подписано директором" },
  "Кадрлар бөлүмүнө жөнөтүлдү": { ky: "Кадрлар бөлүмүнө жөнөтүлдү", ru: "Направлено в отдел кадров" },
  "Направлено в отдел кадров": { ky: "Кадрлар бөлүмүнө жөнөтүлдү", ru: "Направлено в отдел кадров" },
  "Бухгалтерияга жөнөтүлдү": { ky: "Бухгалтерияга жөнөтүлдү", ru: "Направлено в бухгалтерию" },
  "Направлено в бухгалтерию": { ky: "Бухгалтерияга жөнөтүлдү", ru: "Направлено в бухгалтерию" },
  "Окутуучуга кайтарылды": { ky: "Окутуучуга кайтарылды", ru: "Возвращено преподавателю" },
  "Возвращено преподавателю": { ky: "Окутуучуга кайтарылды", ru: "Возвращено преподавателю" },
  "Возвращено на доработку": { ky: "Окутуучуга кайтарылды", ru: "Возвращено преподавателю" },
  "Четке кагылды": { ky: "Четке кагылды", ru: "Отклонено" },
  Отклонено: { ky: "Четке кагылды", ru: "Отклонено" },
};

const AUDIT_ACTIONS = {
  login: { ky: "Системага кирди", ru: "Вход в систему" },
  register: { ky: "Катталуу арызын жөнөттү", ru: "Отправлена заявка на регистрацию" },
  message_sent: { ky: "Кабар жөнөтүлдү", ru: "Сообщение отправлено" },
  request_created: { ky: "Арыз түзүлдү", ru: "Заявление создано" },
  request_status_updated: { ky: "Арыздын абалы жаңырды", ru: "Статус заявления обновлён" },
  document_uploaded: { ky: "Документ жүктөлдү", ru: "Документ загружен" },
  user_approved: { ky: "Колдонуучу тастыкталды", ru: "Пользователь подтверждён" },
};

export function translateRole(value, language) {
  const key = ROLE_ALIASES[value];
  return key ? ROLE_TITLES[key]?.[language] || value : value;
}

export function translateDepartment(value, language) {
  const key = DEPARTMENT_ALIASES[value];
  return key ? DEPARTMENT_TITLES[key]?.[language] || value : value;
}

export function translateUserStatus(value, language) {
  return translations[language]?.statuses?.[value] || value;
}

export function translateRequestType(value, language) {
  return REQUEST_TYPE_TITLES[value]?.[language] || value;
}

export function translateRequestStatus(value, language) {
  return REQUEST_STATUS_TITLES[value]?.[language] || value;
}

export function translateAuditAction(value, language) {
  return AUDIT_ACTIONS[value]?.[language] || value;
}

const DOCUMENT_CATEGORY_TITLES = {
  orders: { ky: "Буйруктар", ru: "Приказы" },
  statements: { ky: "Заявления", ru: "Заявления" },
  reports: { ky: "Отчёттор", ru: "Отчёты" },
  Приказы: { ky: "Буйруктар", ru: "Приказы" },
  Заявления: { ky: "Заявления", ru: "Заявления" },
  "Отчёты": { ky: "Отчёттор", ru: "Отчёты" },
  Буйруктар: { ky: "Буйруктар", ru: "Приказы" },
  Отчёттор: { ky: "Отчёттор", ru: "Отчёты" },
};

export function translateDocumentCategory(value, language) {
  return DOCUMENT_CATEGORY_TITLES[value]?.[language] || value;
}

export function getLocale(language) {
  return language === "ru" ? "ru-RU" : "ky-KG";
}
