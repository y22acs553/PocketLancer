import Notification from "../models/Notification.js";

export async function createNotification({
  userId,
  title,
  message,
  type = "general",
  link = "",
  meta = {},
}) {
  return Notification.create({
    user: userId,
    title,
    message,
    type,
    link,
    meta,
  });
}
