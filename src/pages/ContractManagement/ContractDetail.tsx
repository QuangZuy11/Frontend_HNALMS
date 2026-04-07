import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  Modal,
  Backdrop,
} from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";

const API_URL = "http://localhost:9999/api";

// Self-contained Deposit Modal that fetches data on-demand
function DepositModal({ open, onClose, depositId, serifFont }: {
  open: boolean;
  onClose: () => void;
  depositId: any;
  serifFont: string;
}) {
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !depositId) return;

    // If depositId is already a populated object (has name field), use it directly
    if (typeof depositId === "object" && depositId.name) {
      setDeposit(depositId);
      return;
    }

    // Otherwise, fetch from API using the string ID
    const id = typeof depositId === "string" ? depositId : depositId._id || depositId;
    setLoading(true);
    axios.get(`${API_URL}/deposits`)
      .then((res) => {
        if (res.data.success) {
          const found = res.data.data.find((d: any) => d._id === id);
          setDeposit(found || null);
        }
      })
      .catch((err) => console.error("Error fetching deposit:", err))
      .finally(() => setLoading(false));
  }, [open, depositId]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "Held": return "Đang giữ";
      case "Refunded": return "Đã hoàn";
      case "Forfeited": return "Đã phạt";
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Held": return "primary";
      case "Refunded": return "success";
      default: return "error";
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(0,0,0,0.5)" } } }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          minWidth: 400,
          maxWidth: 500,
          fontFamily: serifFont,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography sx={{ fontWeight: "bold", fontSize: "1.2rem", fontFamily: serifFont }}>
            Thông tin đặt cọc
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : deposit ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, fontFamily: serifFont }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Người cọc:</Typography>
              <Typography sx={{ fontWeight: 600, fontFamily: serifFont }}>{deposit.name || "—"}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Số điện thoại:</Typography>
              <Typography sx={{ fontFamily: serifFont }}>{deposit.phone || "—"}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Email:</Typography>
              <Typography sx={{ fontFamily: serifFont }}>{deposit.email || "—"}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Số tiền cọc:</Typography>
              <Typography sx={{ fontWeight: 600, color: "#d32f2f", fontFamily: serifFont }}>
                {(deposit.amount || 0).toLocaleString("vi-VN")} VNĐ
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Trạng thái:</Typography>
              <Chip
                label={statusLabel(deposit.status)}
                color={statusColor(deposit.status) as any}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}>Ngày cọc:</Typography>
              <Typography sx={{ fontFamily: serifFont }}>
                {deposit.createdAt
                  ? new Date(deposit.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                  : "—"}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ fontStyle: "italic", fontFamily: serifFont }}>
            Không tìm thấy thông tin đặt cọc.
          </Typography>
        )}
      </Box>
    </Modal>
  );
}

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await axios.get(`${API_URL}/contracts/${id}`);
        if (res.data.success) {
          console.log("📋 Contract depositId:", res.data.data.depositId);
          setContract(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching contract:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contract) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h5" color="error">
          Không tìm thấy hợp đồng.
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Quay lại
        </Button>
      </Container>
    );
  }

  const deposit =
    contract.depositId && typeof contract.depositId === "object"
      ? contract.depositId
      : null;

  const roomPrice = parseFloat(
    contract.roomId?.roomTypeId?.currentPrice?.toString() || "0",
  );
  const genderMap: Record<string, string> = {
    Male: "Nam",
    Female: "Nữ",
    Other: "Khác",
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "expired":
        return "warning";
      case "terminated":
        return "error";
      default:
        return "default";
    }
  };
  const statusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Đang hiệu lực";
      case "expired":
        return "Hết hạn";
      case "terminated":
        return "Đã chấm dứt";
      case "pending":
        return "Chờ duyệt";
      default:
        return status;
    }
  };

  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Categorize services
  const getServiceCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("xe máy") || n.includes("xe đạp")) return "quantity_based";
    if (
      n.includes("thang máy") ||
      n.includes("elevator") ||
      n.includes("vệ sinh") ||
      n.includes("điện") ||
      n.includes("nước") ||
      n.includes("internet") ||
      n.includes("wifi")
    )
      return "fixed_monthly";
    return "quantity_based";
  };

  const getServiceUnit = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("điện")) return "VNĐ/kWh";
    if (n.includes("nước")) return "VNĐ/m³";
    return "VNĐ/tháng";
  };

  const fixedServices = (contract.bookServices || []).filter(
    (s: any) => getServiceCategory(s.name) === "fixed_monthly",
  );
  const optionalServices = (contract.bookServices || []).filter(
    (s: any) => getServiceCategory(s.name) === "quantity_based",
  );

  const calculatePrepayMonths = () => {
    if (!contract.startDate || !contract.rentPaidUntil) return 0;
    const start = new Date(contract.startDate);
    const paidUntil = new Date(contract.rentPaidUntil);
    let months = (paidUntil.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += paidUntil.getMonth();
    // The rentPaidUntil logic goes to end of month. If rentPaidUntil is end of Jan, and start is mid Dec,
    // differences in month is 1. If start is Dec 1 and paidUntil is Jan 31, diff is 1.
    // The formulation used in Creation is exactly: start.getMonth() + 1 + prepayMonths
    // So prepayMonths = paidUntil.getMonth() - start.getMonth() - 1 + (years * 12)
    // Wait, let's reverse exactly: 
    // paidUntil = new Date(start.getFullYear(), start.getMonth() + 1 + prepayMonths, 0)
    // paidUntil.getMonth() = (start.getMonth() + 1 + prepayMonths - 1) % 12
    // It's simpler to just do: (paidUntil.getFullYear() - start.getFullYear()) * 12 + paidUntil.getMonth() - start.getMonth()
    let prepay = (paidUntil.getFullYear() - start.getFullYear()) * 12 + paidUntil.getMonth() - start.getMonth();
    return prepay;
  };

  const prepayMonths = calculatePrepayMonths();

  const serifFont = '"Times New Roman", Times, serif';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Top Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ fontFamily: serifFont, textTransform: "none" }}
        >
          Quay lại
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {contract.status === "active" &&
            !location.pathname.startsWith("/owner") && (
              <Button
                variant="outlined"
                onClick={() => navigate(`${location.pathname}/edit`)}
                sx={{ fontFamily: serifFont, textTransform: "none" }}
              >
                Chỉnh sửa
              </Button>
            )}
          <Chip
            label={statusLabel(contract.status)}
            color={statusColor(contract.status) as any}
            sx={{ fontWeight: "bold", fontSize: "0.95rem", px: 1 }}
          />
        </Box>
      </Box>

      {/* Paper Document */}
      <Paper
        elevation={3}
        sx={{
          p: 5,
          minHeight: "800px",
          mx: "auto",
          maxWidth: "900px",
          fontFamily: serifFont,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              textTransform: "uppercase",
              fontWeight: "bold",
              fontFamily: serifFont,
            }}
          >
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: "bold",
              textDecoration: "underline",
              fontFamily: serifFont,
            }}
          >
            Độc lập - Tự do - Hạnh phúc
          </Typography>
          <Typography
            variant="h4"
            sx={{
              mt: 3,
              fontWeight: "bold",
              textTransform: "uppercase",
              fontFamily: serifFont,
            }}
          >
            HỢP ĐỒNG THUÊ NHÀ
          </Typography>
          <Typography
            variant="body1"
            sx={{ fontStyle: "italic", mt: 1, fontFamily: serifFont }}
          >
            (Mã HĐ: {contract.contractCode})
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ lineHeight: 2, fontSize: "1.1rem", fontFamily: serifFont }}>
          <Typography paragraph sx={{ fontFamily: serifFont }}>
            Hôm nay, ngày{" "}
            {new Date(contract.createdAt || contract.startDate).getDate()} tháng{" "}
            {new Date(contract.createdAt || contract.startDate).getMonth() + 1}{" "}
            năm{" "}
            {new Date(contract.createdAt || contract.startDate).getFullYear()},
            tại địa chỉ quản lý tòa nhà.
          </Typography>
          <Typography
            paragraph
            sx={{ fontWeight: "bold", fontFamily: serifFont }}
          >
            Chúng tôi gồm có:
          </Typography>

          {/* BÊN A */}
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                textDecoration: "underline",
                fontFamily: serifFont,
              }}
            >
              BÊN A (Bên cho thuê):
            </Typography>
            <Typography sx={{ fontFamily: serifFont }}>
              Ông/Bà: <strong>QUẢN LÝ TÒA NHÀ HOÀNG NAM</strong>
            </Typography>
            <Typography sx={{ fontFamily: serifFont }}>
              Đại diện cho chủ sở hữu căn hộ.
            </Typography>
          </Box>

          {/* BÊN B */}
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                textDecoration: "underline",
                fontFamily: serifFont,
                mb: 1,
              }}
            >
              BÊN B (Bên thuê):
            </Typography>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Họ và tên:{" "}
                  <strong>
                    {contract.tenantInfo?.fullname ||
                      contract.tenantId?.username ||
                      deposit?.name ||
                      "—"}
                  </strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Sinh ngày:{" "}
                  <strong>{formatDateVN(contract.tenantInfo?.dob)}</strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  CCCD/CMND: <strong>{contract.tenantInfo?.cccd || "—"}</strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Giới tính:{" "}
                  <strong>
                    {genderMap[contract.tenantInfo?.gender] || "—"}
                  </strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Điện thoại:{" "}
                  <strong>
                    {contract.tenantId?.phoneNumber || deposit?.phone || "—"}
                  </strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Email:{" "}
                  <strong>{contract.tenantId?.email || deposit?.email || "—"}</strong>
                </Typography>
              </Grid>
              <Grid size={12}>
                <Typography sx={{ fontFamily: serifFont }}>
                  Hộ khẩu thường trú:{" "}
                  <strong>{contract.tenantInfo?.address || "—"}</strong>
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Danh sách người ở cùng */}
          <Typography
            paragraph
            sx={{ mt: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
          >
            <strong>Danh sách người ở cùng trong phòng</strong> (
            {(contract.coResidents?.length || 0) + 1}/
            {contract.roomId?.roomTypeId?.personMax || "?"} người):
          </Typography>
          <Box sx={{ pl: 3 }}>
            {contract.coResidents && contract.coResidents.length > 0 ? (
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: serifFont,
                  fontSize: "1.05rem",
                  mb: 1.5,
                }}
              >
                <Box component="thead">
                  <Box component="tr">
                    {["STT", "Họ và tên", "Số CCCD/CMND"].map((h) => (
                      <Box
                        component="th"
                        key={h}
                        sx={{
                          border: "1px solid #333",
                          py: 0.8,
                          px: 1.5,
                          textAlign: "center",
                          fontWeight: "bold",
                          bgcolor: "#fafafa",
                          fontFamily: serifFont,
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {contract.coResidents.map((person: any, idx: number) => (
                    <Box component="tr" key={idx}>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontFamily: serifFont,
                          width: "50px",
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          fontFamily: serifFont,
                        }}
                      >
                        {person.fullName || "—"}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontFamily: serifFont,
                        }}
                      >
                        {person.cccd || "—"}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontStyle: "italic",
                  fontFamily: serifFont,
                  fontSize: "1.05rem",
                  mb: 1,
                }}
              >
                Không có người ở cùng.
              </Typography>
            )}
          </Box>

          {/* Agreement */}
          <Typography paragraph sx={{ fontFamily: serifFont }}>
            Hai bên cùng thỏa thuận ký kết hợp đồng thuê nhà với các điều khoản
            sau:
          </Typography>

          {/* Điều 1 */}
          <Typography
            component="div"
            sx={{ mb: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
          >
            <strong>Điều 1:</strong> Bên A đồng ý cho Bên B thuê phòng số{" "}
            <strong>{contract.roomId?.name || "—"}</strong>
            {contract.roomId?.roomTypeId?.typeName && (
              <>
                {" "}
                (Loại: <strong>{contract.roomId.roomTypeId.typeName}</strong>)
              </>
            )}
            .
            <br />- Thời hạn thuê: <strong>{contract.duration}</strong> tháng,
            bắt đầu từ ngày <strong>{formatDateVN(contract.startDate)}</strong>{" "}
            đến ngày <strong>{formatDateVN(contract.endDate)}</strong>.
            {prepayMonths > 0 && (
              <>
                <br />- Trả trước tiền phòng: <strong>{prepayMonths}</strong> tháng
                (Đến hết ngày <strong>{formatDateVN(contract.rentPaidUntil)}</strong>).
              </>
            )}
            <br />- Giá thuê phòng là:{" "}
            <strong style={{ color: "#d32f2f" }}>
              {roomPrice.toLocaleString()}
            </strong>{" "}
            VNĐ/tháng. (Giá này cố định theo loại phòng).
            <br />- Tiền đặt cọc: <strong>
              {roomPrice.toLocaleString()}
            </strong>{" "}
            VNĐ (Tương đương 01 tháng tiền phòng).
            {contract.depositId ? (
              <span
                onClick={() => setShowDepositModal(true)}
                style={{
                  color: "#2e7d32",
                  fontWeight: "bold",
                  marginLeft: 8,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted" as const,
                }}
                title="Xem thông tin cọc"
              >
                ✓ Đã cọc
              </span>
            ) : (
              <span
                style={{
                  color: "#2e7d32",
                  fontWeight: "bold",
                  marginLeft: 8,
                }}
              >
                ✓ Đã cọc
              </span>
            )}
          </Typography>

          {/* Điều 2 - Thiết bị */}
          <Typography
            component="div"
            sx={{ mb: 1, fontFamily: serifFont, fontSize: "1.1rem" }}
          >
            <strong>Điều 2:</strong> Các trang thiết bị, tài sản bàn giao kèm
            theo phòng:
          </Typography>
          <Box sx={{ pl: 3, mb: 2 }}>
            {contract.assets && contract.assets.length > 0 ? (
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: serifFont,
                  fontSize: "1.05rem",
                  mb: 1,
                }}
              >
                <Box component="thead">
                  <Box component="tr">
                    {[
                      "STT",
                      "Tên thiết bị",
                      "Số lượng",
                      "Đơn vị",
                      "Tình trạng",
                    ].map((h) => (
                      <Box
                        component="th"
                        key={h}
                        sx={{
                          border: "1px solid #333",
                          py: 0.8,
                          px: 1.5,
                          textAlign: "center",
                          fontWeight: "bold",
                          bgcolor: "#fafafa",
                          fontFamily: serifFont,
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {contract.assets.map((asset: any, index: number) => (
                    <Box component="tr" key={index}>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontFamily: serifFont,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          fontFamily: serifFont,
                        }}
                      >
                        {asset.deviceId?.name || "Thiết bị"}
                        {asset.deviceId?.brand
                          ? ` (${asset.deviceId.brand})`
                          : ""}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontWeight: "bold",
                          fontFamily: serifFont,
                        }}
                      >
                        {asset.quantity || 1}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontFamily: serifFont,
                        }}
                      >
                        {asset.deviceId?.unit || "cái"}
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          border: "1px solid #333",
                          py: 0.5,
                          px: 1.5,
                          textAlign: "center",
                          fontFamily: serifFont,
                        }}
                      >
                        {asset.condition === "Good"
                          ? "Tốt"
                          : asset.condition || "Tốt"}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontStyle: "italic",
                  fontFamily: serifFont,
                  fontSize: "1.05rem",
                }}
              >
                Không có thiết bị bàn giao.
              </Typography>
            )}
          </Box>

          {/* Điều 3 - Dịch vụ */}
          <Typography
            paragraph
            sx={{ mt: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
          >
            <strong>Điều 3:</strong> Các dịch vụ hàng tháng đi kèm:
          </Typography>
          <Box sx={{ pl: 3 }}>
            {fixedServices.length > 0 || optionalServices.length > 0 ? (
              <>
                {fixedServices.length > 0 && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontFamily: serifFont,
                        fontSize: "1.1rem",
                        mb: 0.5,
                        textDecoration: "underline",
                      }}
                    >
                      a) Dịch vụ cố định hàng tháng:
                    </Typography>
                    {fixedServices.map((service: any, idx: number) => (
                      <Typography
                        key={idx}
                        sx={{
                          fontFamily: serifFont,
                          fontSize: "1.1rem",
                          pl: 2,
                          mb: 0.3,
                          lineHeight: 1.8,
                        }}
                      >
                        {idx + 1}. {service.name}:{" "}
                        <strong style={{ color: "#d32f2f" }}>
                          {(service.currentPrice || 0).toLocaleString()}
                        </strong>{" "}
                        {getServiceUnit(service.name)}{" "}
                        <span style={{ color: "#2e7d32" }}>
                          (Bắt buộc — tính vào hóa đơn hàng tháng)
                        </span>
                      </Typography>
                    ))}
                  </Box>
                )}

                {optionalServices.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontFamily: serifFont,
                        fontSize: "1.1rem",
                        mb: 0.5,
                        textDecoration: "underline",
                      }}
                    >
                      b) Dịch vụ tùy chọn đã đăng ký:
                    </Typography>
                    {optionalServices.map((service: any, idx: number) => (
                      <Typography
                        key={idx}
                        sx={{
                          fontFamily: serifFont,
                          fontSize: "1.1rem",
                          pl: 2,
                          mb: 0.3,
                          lineHeight: 1.8,
                        }}
                      >
                        {idx + 1}. {service.name}:{" "}
                        <strong style={{ color: "#d32f2f" }}>
                          {(service.currentPrice || 0).toLocaleString()}
                        </strong>{" "}
                        VNĐ/tháng
                        {service.quantity && service.quantity > 0 && (
                          <span>
                            {" "}
                            × <strong>{service.quantity}</strong> ={" "}
                            <strong style={{ color: "#d32f2f" }}>
                              {(
                                (service.currentPrice || 0) * service.quantity
                              ).toLocaleString()}
                            </strong>{" "}
                            VNĐ/tháng
                          </span>
                        )}
                      </Typography>
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Typography
                sx={{
                  pl: 2,
                  fontStyle: "italic",
                  fontFamily: serifFont,
                }}
              >
                Không có dịch vụ đi kèm.
              </Typography>
            )}
          </Box>

          {/* Điều 4 - Quy định chung */}
          <Typography
            paragraph
            sx={{ mt: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
          >
            <strong>Điều 4:</strong> Quy định chung:
          </Typography>
          <Box sx={{ pl: 3 }}>
            <Typography
              sx={{ fontFamily: serifFont, fontSize: "1.05rem", mb: 0.5 }}
            >
              - Bên B phải thanh toán tiền thuê phòng và các dịch vụ đúng hạn
              hàng tháng.
            </Typography>
            <Typography
              sx={{ fontFamily: serifFont, fontSize: "1.05rem", mb: 0.5 }}
            >
              - Bên B không được tự ý sửa chữa, thay đổi kết cấu phòng khi chưa
              có sự đồng ý của Bên A.
            </Typography>
            <Typography
              sx={{ fontFamily: serifFont, fontSize: "1.05rem", mb: 0.5 }}
            >
              - Khi hết hạn hợp đồng, nếu không gia hạn, Bên B phải bàn giao lại
              phòng và các tài sản trong tình trạng tốt.
            </Typography>
            <Typography
              sx={{ fontFamily: serifFont, fontSize: "1.05rem", mb: 0.5 }}
            >
              - Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị
              pháp lý ngang nhau.
            </Typography>
          </Box>

          {/* Chữ ký */}
        </Box>

        {/* Contract Images */}
        {contract.images && contract.images.length > 0 && (
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: "1px solid #333",
            }}
          >
            <Typography
              sx={{
                fontWeight: "bold",
                fontFamily: serifFont,
                fontSize: "1.1rem",
                mb: 1.5,
              }}
            >
              Ảnh hợp đồng bản cứng (đã ký)
            </Typography>
            <Grid container spacing={2}>
              {contract.images.map((url: string, idx: number) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
                  <Box
                    onClick={() => setLightboxImage(url)}
                    sx={{
                      cursor: "pointer",
                      border: "1px solid #333",
                      overflow: "hidden",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "scale(1.03)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    <img
                      src={url}
                      alt={`Hợp đồng ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: 180,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <Typography
                      sx={{
                        display: "block",
                        textAlign: "center",
                        py: 0.5,
                        fontFamily: serifFont,
                        fontSize: "0.9rem",
                        borderTop: "1px solid #333",
                      }}
                    >
                      Ảnh {idx + 1}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Lightbox Modal */}
      <Modal
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { sx: { bgcolor: "rgba(0,0,0,0.85)" } } }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
          onClick={() => setLightboxImage(null)}
        >
          <IconButton
            onClick={() => setLightboxImage(null)}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              zIndex: 10,
            }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Ảnh hợp đồng phóng to"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </Box>
      </Modal>

      {/* Deposit Detail Modal */}
      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        depositId={contract?.depositId}
        serifFont={serifFont}
      />
    </Container>
  );
};

export default ContractDetail;
