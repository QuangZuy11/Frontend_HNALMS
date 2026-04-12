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

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Phòng từ chối gia hạn và đã có HĐ kế tiếp (bắt đầu sau ngày kết thúc HĐ đang ở) — khách B không còn "Tạo hợp đồng, cọc mới".
 */
export function hasSuccessorContractAfterDeclinedTenant(
  room: { contractRenewalStatus?: string | null } | null | undefined,
  roomContracts: {
    _id?: string;
    status?: string;
    startDate?: string | Date;
    endDate?: string | Date;
  }[],
): boolean {
  if (room?.contractRenewalStatus !== "declined") return false;
  if (!roomContracts?.length) return false;

  const today = startOfLocalDay(new Date());
  const occupying = roomContracts.find((c) => {
    if (c.status !== "active") return false;
    if (!c.startDate || !c.endDate) return false;
    const s = startOfLocalDay(new Date(c.startDate));
    const e = startOfLocalDay(new Date(c.endDate));
    return s <= today && today <= e;
  });
  if (!occupying?.endDate) return false;

  const currentEnd = startOfLocalDay(new Date(occupying.endDate));
  const terminal = new Set(["terminated", "expired"]);

  const occId = occupying._id != null ? String(occupying._id) : "";

  return roomContracts.some((c) => {
    if (c._id == null || String(c._id) === occId) return false;
    if (!c.status || terminal.has(c.status) || !c.startDate) return false;
    const st = startOfLocalDay(new Date(c.startDate));
    return st > currentEnd;
  });
}
