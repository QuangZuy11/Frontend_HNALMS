import { useState, useEffect } from "react";
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Chip,
    Divider,
    Button,
    CircularProgress,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const API_URL = "http://localhost:9999/api";

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await axios.get(`${API_URL}/contracts/${id}`);
                if (res.data.success) {
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
                <Typography variant="h5" color="error">Không tìm thấy hợp đồng.</Typography>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Quay lại</Button>
            </Container>
        );
    }

    const roomPrice = parseFloat(contract.roomId?.roomTypeId?.currentPrice?.toString() || "0");
    const depositAmount = roomPrice;
    const genderMap: Record<string, string> = { Male: "Nam", Female: "Nữ", Other: "Khác" };

    const statusColor = (status: string) => {
        switch (status) {
            case "active": return "success";
            case "expired": return "warning";
            case "terminated": return "error";
            default: return "default";
        }
    };
    const statusLabel = (status: string) => {
        switch (status) {
            case "active": return "Đang hiệu lực";
            case "expired": return "Hết hạn";
            case "terminated": return "Đã chấm dứt";
            case "pending": return "Chờ duyệt";
            default: return status;
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Quay lại</Button>
                <Typography variant="h5" fontWeight="bold">Chi tiết Hợp đồng</Typography>
                <Chip
                    label={statusLabel(contract.status)}
                    color={statusColor(contract.status) as any}
                    sx={{ fontWeight: "bold", fontSize: "0.9rem" }}
                />
            </Paper>

            {/* Contract Document */}
            <Paper sx={{ p: 4, fontFamily: '"Times New Roman", serif', fontSize: '1.1rem', lineHeight: 1.8 }}>
                {/* Title */}
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography variant="h6" sx={{ fontFamily: '"Times New Roman", serif', fontWeight: "bold", textTransform: "uppercase" }}>
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </Typography>
                    <Typography sx={{ fontFamily: '"Times New Roman", serif', fontWeight: "bold", fontSize: "1.1rem" }}>
                        Độc lập - Tự do - Hạnh phúc
                    </Typography>
                    <Divider sx={{ width: 200, mx: "auto", my: 1, borderWidth: 1 }} />
                    <Typography variant="h5" sx={{ fontFamily: '"Times New Roman", serif', fontWeight: "bold", mt: 2 }}>
                        HỢP ĐỒNG THUÊ PHÒNG
                    </Typography>
                    <Typography sx={{ fontFamily: '"Times New Roman", serif', fontStyle: "italic", color: "#666" }}>
                        Mã HĐ: {contract.contractCode}
                    </Typography>
                </Box>

                {/* Party A */}
                <Typography paragraph sx={{ fontWeight: "bold" }}>BÊN A (Bên cho thuê): HOÀNG NAM BUILDING</Typography>

                {/* Party B */}
                <Typography paragraph sx={{ fontWeight: "bold", mt: 2 }}>BÊN B (Bên thuê):</Typography>
                <Box sx={{ pl: 3 }}>
                    <Grid container spacing={1}>
                        <Grid size={6}>
                            <Typography>Họ và tên: <strong>{contract.tenantInfo?.fullname || contract.tenantId?.username || "—"}</strong></Typography>
                        </Grid>
                        <Grid size={6}>
                            <Typography>Giới tính: <strong>{genderMap[contract.tenantInfo?.gender] || "—"}</strong></Typography>
                        </Grid>
                        <Grid size={6}>
                            <Typography>Ngày sinh: <strong>{contract.tenantInfo?.dob ? new Date(contract.tenantInfo.dob).toLocaleDateString("vi-VN") : "—"}</strong></Typography>
                        </Grid>
                        <Grid size={6}>
                            <Typography>CCCD: <strong>{contract.tenantInfo?.cccd || "—"}</strong></Typography>
                        </Grid>
                        <Grid size={6}>
                            <Typography>SĐT: <strong>{contract.tenantId?.phoneNumber || "—"}</strong></Typography>
                        </Grid>
                        <Grid size={6}>
                            <Typography>Email: <strong>{contract.tenantId?.email || "—"}</strong></Typography>
                        </Grid>
                        <Grid size={12}>
                            <Typography>Hộ khẩu thường trú: <strong>{contract.tenantInfo?.address || "—"}</strong></Typography>
                        </Grid>
                    </Grid>
                </Box>

                {/* Agreement */}
                <Typography paragraph sx={{ mt: 3 }}>
                    Hai bên cùng thỏa thuận ký kết hợp đồng thuê nhà với các điều khoản sau:
                </Typography>

                {/* Điều 1 - Room & Financial */}
                <Typography component="div" sx={{ mb: 2 }}>
                    <strong>Điều 1:</strong> Bên A đồng ý cho Bên B thuê phòng số <strong>{contract.roomId?.name || "—"}</strong>
                    {contract.roomId?.roomTypeId?.typeName && (
                        <> (Loại: <strong>{contract.roomId.roomTypeId.typeName}</strong>)</>
                    )}.
                    <br />
                    - Thời hạn thuê: <strong>{contract.duration}</strong> tháng, bắt đầu từ ngày <strong>{new Date(contract.startDate).toLocaleDateString("vi-VN")}</strong> đến ngày <strong>{new Date(contract.endDate).toLocaleDateString("vi-VN")}</strong>.
                    <br />
                    - Giá thuê phòng là: <strong style={{ color: "#d32f2f" }}>{roomPrice.toLocaleString()}</strong> VNĐ/tháng. (Giá này cố định theo loại phòng).
                    <br />
                    - Tiền đặt cọc: <strong>{depositAmount.toLocaleString()}</strong> VNĐ (Tương đương 01 tháng tiền phòng).
                </Typography>

                {/* Điều 2 - Assets */}
                <Typography component="div" sx={{ mb: 1 }}>
                    <strong>Điều 2:</strong> Các trang thiết bị/tài sản bàn giao kèm theo phòng:
                </Typography>
                <Box sx={{ pl: 3, mb: 2 }}>
                    {contract.assets && contract.assets.length > 0 ? (
                        <Grid container spacing={1}>
                            {contract.assets.map((asset: any, idx: number) => (
                                <Grid size={{ xs: 12, md: 6 }} key={asset._id || idx}>
                                    <Typography>
                                        {idx + 1}. {asset.deviceId?.name || "Thiết bị"}
                                        {asset.deviceId?.brand ? ` (${asset.deviceId.brand})` : ""}
                                        {" "} - SL: <strong>{asset.quantity || 1}</strong> cái
                                        ({asset.condition === "Good" ? "Tốt" : asset.condition})
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography sx={{ fontStyle: "italic" }}>Không có tài sản bàn giao.</Typography>
                    )}
                </Box>

                {/* Điều 3 - Services */}
                <Typography component="div" sx={{ mb: 1 }}>
                    <strong>Điều 3:</strong> Các dịch vụ hàng tháng đi kèm:
                </Typography>
                <Box sx={{ pl: 3, mb: 2 }}>
                    {contract.services && contract.services.length > 0 ? (
                        <Grid container spacing={1}>
                            {contract.services.map((service: any, idx: number) => (
                                <Grid size={{ xs: 12, md: 6 }} key={service._id || idx}>
                                    <Typography>
                                        ✓ {service.name} - <strong>{(service.currentPrice || 0).toLocaleString()}</strong> VNĐ/tháng
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography sx={{ fontStyle: "italic" }}>Không có dịch vụ đi kèm.</Typography>
                    )}
                </Box>

                {/* Điều 4 - Co-residents */}
                <Typography component="div" sx={{ mb: 1 }}>
                    <strong>Điều 4:</strong> Danh sách người ở cùng ({contract.personInRoom || 1}/{contract.roomId?.roomTypeId?.personMax || "?"} người):
                </Typography>
                <Box sx={{ pl: 3, mb: 2 }}>
                    {contract.coResidents && contract.coResidents.length > 0 ? (
                        contract.coResidents.map((person: any, idx: number) => (
                            <Typography key={idx}>
                                {idx + 1}. {person.fullName || "—"} — CCCD: {person.cccd || "—"}
                                {person.phone ? ` — SĐT: ${person.phone}` : ""}
                            </Typography>
                        ))
                    ) : (
                        <Typography sx={{ fontStyle: "italic" }}>Không có người ở cùng.</Typography>
                    )}
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Payment Info */}
                <Typography variant="h6" sx={{ fontFamily: '"Times New Roman", serif', fontWeight: "bold", mb: 1 }}>
                    Thông tin thanh toán ban đầu
                </Typography>
                {contract.financials?.initialPayment && (
                    <Box sx={{ pl: 3 }}>
                        <Typography>
                            Tiền thuê (ngày lẻ): <strong>{(contract.financials.initialPayment.rentAmount || 0).toLocaleString()}</strong> VNĐ
                        </Typography>
                        <Typography>
                            Tiền đặt cọc: <strong>{(contract.financials.initialPayment.depositAmount || 0).toLocaleString()}</strong> VNĐ
                        </Typography>
                        <Typography sx={{ fontWeight: "bold", color: "#d32f2f", fontSize: "1.2rem", mt: 1 }}>
                            Tổng thanh toán: {(contract.financials.initialPayment.total || 0).toLocaleString()} VNĐ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phương thức: {contract.financials.initialPayment.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                            {contract.financials.initialPayment.paidAt && (
                                <> — Ngày thanh toán: {new Date(contract.financials.initialPayment.paidAt).toLocaleDateString("vi-VN")}</>
                            )}
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Signatures */}
                <Grid container sx={{ mt: 4 }}>
                    <Grid size={6} sx={{ textAlign: "center" }}>
                        <Typography sx={{ fontWeight: "bold" }}>BÊN A</Typography>
                        <Typography variant="body2" sx={{ fontStyle: "italic" }}>(Ký và ghi rõ họ tên)</Typography>
                    </Grid>
                    <Grid size={6} sx={{ textAlign: "center" }}>
                        <Typography sx={{ fontWeight: "bold" }}>BÊN B</Typography>
                        <Typography variant="body2" sx={{ fontStyle: "italic" }}>(Ký và ghi rõ họ tên)</Typography>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
};

export default ContractDetail;
