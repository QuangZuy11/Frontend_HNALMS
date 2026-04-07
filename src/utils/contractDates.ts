/**
 * Hợp đồng lưu startDate thường là nửa đêm UTC (vd. 2026-04-08T00:00:00.000Z).
 * So sánh trực tiếp với `new Date()` khiến trước 7h sáng VN vẫn là "ngày hôm trước" theo UTC → nhầm là chưa bắt đầu.
 * So sánh theo ngày lịch trên múi giờ trình duyệt khớp cách hiển thị (toLocaleDateString vi-VN).
 */
export function isContractStartedByLocalCalendar(
  startDate: string | Date,
): boolean {
  const start = new Date(startDate);
  const now = new Date();
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return startDay <= todayStart;
}
