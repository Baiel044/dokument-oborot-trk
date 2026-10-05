const { EventEmitter } = require("events");

const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(100);

function publishNotifications(notifications) {
  notifications
    .filter((notification) => notification?.id && notification?.userId)
    .forEach((notification) => notificationEvents.emit("notification:new", notification));
}

function onNewNotification(listener) {
  notificationEvents.on("notification:new", listener);
  return () => notificationEvents.off("notification:new", listener);
}

module.exports = {
  onNewNotification,
  publishNotifications,
};
