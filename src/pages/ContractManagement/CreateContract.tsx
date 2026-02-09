import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Container,
    Grid,
    TextField,
    Typography,
    Paper,
    Checkbox,
    FormControlLabel,
    Divider,
    Alert,
    Stepper,
    Step,
    StepLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import { Tabs, Tab } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

// Mock API URL - Replace with actual
const API_URL = "http://localhost:9999/api";

const steps = ["Chọn Phòng", "Chi tiết Hợp Đồng"];

interface CoResident {
    fullName: string;
    cccd: string;
}

interface ContractFormValues {
    roomId: string;
    startDate: string;
    duration: number;
    financials: {
        roomPrice: number;
        depositAmount: number;
    };
    services: string[];
    initialReadings: {
        electricity: number;
        water: number;
    };
    tenantInfo: {
        fullName: string;
        phone: string;
        email: string;
        address: string;
        dob: string;
        cccd: string;
        gender: string;
        contactRef: string;
    };
    coResidents: CoResident[];
}

const CreateContract = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeStep, setActiveStep] = useState(0);
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [activeFloorTab, setActiveFloorTab] = useState(0);
    const [services, setServices] = useState<any[]>([]); // Fetch from DB
    const [assets, setAssets] = useState<any[]>([]); // Fetch from Room/Device

    // Pre-fill from navigation state (e.g., from Room Detail or Deposit)
    const preFilledRoomId = location.state?.roomId;
    const preFilledDepositId = location.state?.depositId;

    const { control, handleSubmit, watch, setValue, getValues, register, formState: { errors } } = useForm<ContractFormValues>({
        defaultValues: {
            roomId: preFilledRoomId || "",
            startDate: new Date().toISOString().split("T")[0],
            duration: 12,
            tenantInfo: {
                fullName: "",
                dob: "",
                cccd: "",
                address: "",
                phone: "",
                email: "",
                gender: "Male",
                contactRef: "" // Bố mẹ
            },
            coResidents: [],
            services: [],
            initialReadings: {
                electricity: 0,
                water: 0
            },
            financials: {
                depositAmount: 0,
                roomPrice: 0
            }
        }
    });

    const { fields: coResidentFields, append: appendCoResident, remove: removeCoResident } = useFieldArray({
        control,
        name: "coResidents"
    });

    // Fetch Rooms & Services on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const roomsRes = await axios.get(`${API_URL}/rooms`); // Need filtered functionality

                // Show all rooms (Occupied ones should be styled differently and unselectable)
                const rawRooms = roomsRes.data.data || [];

                // Map to match component expectations (FloorMap expects price, handleSelect expects price)
                const mappedRooms = rawRooms.map((room: any) => ({
                    ...room,
                    price: room.roomTypeId?.currentPrice || 0,
                    floorLabel: room.floorId?.name || "N/A"
                }));

                setRooms(mappedRooms);

                // Mock Services for now if API not ready
                const servicesRes = await axios.get(`${API_URL}/services`);
                if (servicesRes.data.success) {
                    setServices(servicesRes.data.data);
                } else {
                    setServices([]);
                }
                // setServices([
                //     { _id: "1", name: "Internet", price: 50000, type: "fixed" },
                //     { _id: "2", name: "Thang máy", price: 50000, type: "fixed" },
                //     { _id: "3", name: "Vệ sinh", price: 30000, type: "fixed" },
                //     { _id: "4", name: "Gửi xe", price: 100000, type: "fixed" },
                // ]);

                if (preFilledRoomId) {
                    const room = mappedRooms?.find((r: any) => r._id === preFilledRoomId);
                    if (room) handleRoomSelect(room);
                }
            } catch (err) {
                console.error("Error fetching data", err);
            }
        };
        fetchData();
    }, [preFilledRoomId]);

    const handleRoomSelect = (room: any) => {
        // Prevent selecting Occupied rooms
        if (room.status === "Occupied" || room.status === "Đang thuê") {
            alert("Phòng này đã có người thuê! Vui lòng chọn phòng Trống hoặc Đã cọc.");
            return;
        }
        setSelectedRoom(room);
        setValue("roomId", room._id);
        setValue("financials.roomPrice", room.price);
        setValue("financials.depositAmount", room.price); // Default 1 month

        // Validating assets (Mock)
        setAssets([
            { name: "Điều hòa", quantity: 1, condition: "Tốt" },
            { name: "Bình nóng lạnh", quantity: 1, condition: "Tốt" }
        ]);
    };

    const watchRoomId = watch("roomId");
    useEffect(() => {
        if (watchRoomId && rooms.length > 0) {
            const room = rooms.find((r: any) => r._id === watchRoomId);
            if (room) handleRoomSelect(room);
        }
    }, [watchRoomId, rooms]);

    // Financial Calculation
    const calculateInitialPayment = () => {
        const vals = getValues();
        const price = Number(vals.financials.roomPrice) || 0;
        const deposit = Number(vals.financials.depositAmount) || 0;
        const start = new Date(vals.startDate);


        // Calculate remaining days in month
        // Logic: If start date is 15th, pay for 15th to end of month.
        // JS Date month is 0-indexed.
        const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        const totalDaysInMonth = endOfMonth.getDate();
        const daysRemaining = totalDaysInMonth - start.getDate() + 1; // inclusive

        const rentAmount = Math.round((price / totalDaysInMonth) * daysRemaining);
        const total = rentAmount + deposit;

        return { rentAmount, deposit, total, daysRemaining };
    };

    const paymentDetails = calculateInitialPayment();

    const onSubmit = async (data: any) => {
        try {
            // Map selected service IDs to full service objects
            const selectedServiceIds = data.services || [];
            const selectedServices = services
                .filter(s => selectedServiceIds.includes(s._id))
                .map(s => ({
                    serviceId: s._id,
                    name: s.name,
                    price: s.price,
                    type: s.type,
                    quantity: 1
                }));

            const payload = {
                ...data,
                depositId: preFilledDepositId,
                contractDetails: {
                    startDate: data.startDate,
                    duration: Number(data.duration),
                    roomPrice: Number(data.financials.roomPrice),
                    depositAmount: Number(data.financials.depositAmount),
                    services: selectedServices, // Send full objects
                    paymentCycle: 1 // Default
                },
                assets: assets,
                initialPayment: {
                    rentAmount: paymentDetails.rentAmount,
                    total: paymentDetails.total,
                    paymentMethod: "cash"
                }
            };

            const res = await axios.post(`${API_URL}/contracts/create`, payload);
            if (res.data.success) {
                alert(`Tạo hợp đồng thành công! \nTài khoản Tenant: ${res.data.data.account.username} \nMật khẩu: ${res.data.data.account.password}`);
                // Redirect
                navigate("/manager/contracts");
            }
        } catch (err: any) {
            alert("Lỗi tạo hợp đồng: " + (err.response?.data?.message || err.message));
        }
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!selectedRoom) {
                alert("Vui lòng chọn một phòng trước khi tiếp tục!");
                return;
            }
            setActiveStep(1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* STEP 1: SELECT ROOM */}
                {activeStep === 0 && (
                    <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: '#f8f9fa' }}>
                        <Typography variant="h6" gutterBottom color="primary">1. Chọn Phòng từ Sơ đồ</Typography>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <Tabs value={activeFloorTab} onChange={(e, v) => setActiveFloorTab(v)} sx={{ mb: 2 }} variant="scrollable">
                                    <Tab label="Tầng 1" />
                                    <Tab label="Tầng 2" />
                                    <Tab label="Tầng 3" />
                                    <Tab label="Tầng 4" />
                                    <Tab label="Tầng 5" />
                                </Tabs>

                                <Box sx={{ mb: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden', minHeight: '400px' }}>
                                    {activeFloorTab === 0 && <FloorMap rooms={rooms.filter((r: any) => r.floorId?.name === "1" || r.floorId?.name === "Tầng 1" || r.name.startsWith("1"))} onRoomSelect={handleRoomSelect} />}
                                    {activeFloorTab === 1 && <FloorMapLevel2 rooms={rooms.filter((r: any) => r.floorId?.name === "2" || r.floorId?.name === "Tầng 2" || r.name.startsWith("2"))} onRoomSelect={handleRoomSelect} />}
                                    {activeFloorTab === 2 && <FloorMapLevel3 rooms={rooms.filter((r: any) => r.floorId?.name === "3" || r.floorId?.name === "Tầng 3" || r.name.startsWith("3"))} onRoomSelect={handleRoomSelect} />}
                                    {activeFloorTab === 3 && <FloorMapLevel4 rooms={rooms.filter((r: any) => r.floorId?.name === "4" || r.floorId?.name === "Tầng 4" || r.name.startsWith("4"))} onRoomSelect={handleRoomSelect} />}
                                    {activeFloorTab === 4 && <FloorMapLevel5 rooms={rooms.filter((r: any) => r.floorId?.name === "5" || r.floorId?.name === "Tầng 5" || r.name.startsWith("5"))} onRoomSelect={handleRoomSelect} />}
                                </Box>

                                <TextField
                                    label="Phòng đã chọn"
                                    value={selectedRoom ? `${selectedRoom.name} - ${selectedRoom.price?.toLocaleString()}đ` : "Vui lòng chọn phòng trên sơ đồ"}
                                    fullWidth
                                    size="small"
                                    InputProps={{ readOnly: true }}
                                    error={!!errors.roomId}
                                    helperText={errors.roomId?.message as string}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                {/* STEP 2: CONTRACT DETAILS */}
                {activeStep === 1 && (
                    <Box>
                        {/* Contract Configuration */}
                        <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: '#fff' }}>
                            <Typography variant="h6" gutterBottom color="primary">2. Cấu hình Hợp đồng</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        label="Ngày bắt đầu*"
                                        InputLabelProps={{ shrink: true }}
                                        {...register("startDate", { required: true })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Thời hạn (tháng)*"
                                        {...register("duration", { required: true, min: 6 })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Tiền cọc (mặc định 1 tháng)*"
                                        {...register("financials.depositAmount", { required: true })}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Paper Document Representation */}
                        <Paper elevation={3} sx={{ p: 5, minHeight: '800px', mx: 'auto', maxWidth: '900px', fontFamily: '"Times New Roman", Times, serif' }}>
                            {/* Header */}
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Typography variant="h5" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                                </Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                                    Độc lập - Tự do - Hạnh phúc
                                </Typography>
                                <Typography variant="h4" sx={{ mt: 3, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    HỢP ĐỒNG THUÊ NHÀ
                                </Typography>
                                <Typography variant="body1" sx={{ fontStyle: 'italic', mt: 1 }}>
                                    (Số: {selectedRoom ? `HĐ-${selectedRoom.name}` : "..."}/...)
                                </Typography>
                            </Box>

                            {/* Body */}
                            <Box sx={{ lineHeight: 2, fontSize: '1.1rem' }}>
                                <Typography paragraph>
                                    Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, tại địa chỉ quản lý tòa nhà.
                                </Typography>
                                <Typography paragraph sx={{ fontWeight: 'bold' }}>
                                    Chúng tôi gồm có:
                                </Typography>

                                {/* BEN A */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography sx={{ fontWeight: 'bold', textDecoration: 'underline' }}>BÊN A (Bên cho thuê):</Typography>
                                    <Typography>Ông/Bà: <strong>QUẢN LÝ TÒA NHÀ HOÀNG NAM</strong></Typography>
                                    <Typography>Đại diện cho chủ sở hữu căn hộ.</Typography>
                                </Box>

                                {/* BEN B */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography sx={{ fontWeight: 'bold', textDecoration: 'underline' }}>BÊN B (Bên thuê):</Typography>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField variant="standard" fullWidth placeholder="Họ và tên..." {...register("tenantInfo.fullName", { required: true })} InputProps={{ style: { fontSize: '1.1rem', fontWeight: 'bold' } }} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Grid container alignItems="center">
                                                <Typography component="span" sx={{ mr: 1 }}>Sinh ngày:</Typography>
                                                <TextField variant="standard" type="date" {...register("tenantInfo.dob")} InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                            </Grid>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Grid container alignItems="center">
                                                <Typography component="span" sx={{ mr: 1 }}>CCCD/CMND:</Typography>
                                                <TextField variant="standard" fullWidth placeholder="Số CCCD..." {...register("tenantInfo.cccd", { required: true })} InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                            </Grid>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Grid container alignItems="center">
                                                <Typography component="span" sx={{ mr: 1 }}>Điện thoại:</Typography>
                                                <TextField variant="standard" fullWidth placeholder="SĐT liên hệ..." {...register("tenantInfo.phone", { required: true })} InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                            </Grid>
                                        </Grid>
                                        <Grid size={12}>
                                            <Grid container alignItems="center">
                                                <Typography component="span" sx={{ mr: 1 }}>Email:</Typography>
                                                <TextField variant="standard" fullWidth placeholder="Email nhận thông báo..." {...register("tenantInfo.email", { required: true })} InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                            </Grid>
                                        </Grid>
                                        <Grid size={12}>
                                            <Grid container alignItems="center">
                                                <Typography component="span" sx={{ mr: 1 }}>Hộ khẩu thường trú:</Typography>
                                                <TextField variant="standard" fullWidth placeholder="Địa chỉ..." {...register("tenantInfo.address")} InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Agreement */}
                                <Typography paragraph>
                                    Hai bên cùng thỏa thuận ký kết hợp đồng thuê nhà với các điều khoản sau:
                                </Typography>

                                <Typography paragraph>
                                    <strong>Điều 1:</strong> Bên A đồng ý cho Bên B thuê phòng số <strong>{selectedRoom?.name || "..."}</strong>.
                                    <br />
                                    Giá thuê phòng là:
                                    <TextField
                                        variant="standard"
                                        type="number"
                                        sx={{ width: 150, mx: 1 }}
                                        inputProps={{ style: { textAlign: 'right', fontWeight: 'bold' } }}
                                        /* READONLY as requested */
                                        disabled
                                        {...register("financials.roomPrice")}
                                    />
                                    VNĐ/tháng. (Giá này cố định theo loại phòng).
                                </Typography>

                                <Typography paragraph>
                                    <strong>Điều 2:</strong> Các dịch vụ đi kèm bao gồm:
                                </Typography>
                                <Grid container spacing={1} sx={{ pl: 3 }}>
                                    {services.map((svc) => (
                                        <Grid size={{ xs: 6, md: 4 }} key={svc._id}>
                                            <FormControlLabel
                                                control={<Checkbox value={svc._id} {...register("services")} />}
                                                label={<Typography sx={{ fontFamily: '"Times New Roman", serif' }}>{svc.name} ({svc.price?.toLocaleString()}đ)</Typography>}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>

                                <Typography paragraph sx={{ mt: 2 }}>
                                    <strong>Điều 3:</strong> Chỉ số điện/nước ban đầu khi bàn giao phòng:
                                </Typography>
                                <Grid container spacing={2} sx={{ pl: 3 }}>
                                    <Grid size={6}>
                                        Điện: <TextField variant="standard" type="number" sx={{ width: 100 }} {...register("initialReadings.electricity")} /> kWh
                                    </Grid>
                                    <Grid size={6}>
                                        Nước: <TextField variant="standard" type="number" sx={{ width: 100 }} {...register("initialReadings.water")} /> m3
                                    </Grid>
                                </Grid>

                                <Typography paragraph sx={{ mt: 2 }}>
                                    <strong>Điều 4:</strong> Danh sách người ở cùng:
                                </Typography>
                                <Box sx={{ pl: 3 }}>
                                    {coResidentFields.map((item, index) => (
                                        <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'flex-end' }}>
                                            <Typography>{index + 1}.</Typography>
                                            <TextField variant="standard" placeholder="Họ tên" {...register(`coResidents.${index}.fullName` as const)} />
                                            <TextField variant="standard" placeholder="CCCD" {...register(`coResidents.${index}.cccd` as const)} />
                                            <Button size="small" color="error" onClick={() => removeCoResident(index)}>X</Button>
                                        </Box>
                                    ))}
                                    <Button size="small" onClick={() => appendCoResident({ fullName: "", cccd: "" })} startIcon={<PersonAddIcon />}>Thêm người ở</Button>
                                </Box>
                            </Box>

                            {/* Initial Payment Summary - Doc style */}
                            <Box sx={{ mt: 4, pt: 2, borderTop: '1px dashed #ccc' }}>
                                <Typography variant="h6" sx={{ textDecoration: 'underline', fontStyle: 'italic' }}>Tóm tắt thanh toán đợt 1:</Typography>
                                <Typography>
                                    - Tiền cọc: <strong>{paymentDetails.deposit.toLocaleString()} đ</strong>
                                </Typography>
                                <Typography>
                                    - Tiền phòng ({paymentDetails.daysRemaining} ngày đầu): <strong>{paymentDetails.rentAmount.toLocaleString()} đ</strong>
                                </Typography>
                                <Typography variant="h6" color="error">
                                    TỔNG CỘNG CẦN THU: {paymentDetails.total.toLocaleString()} VNĐ
                                </Typography>
                            </Box>

                            {/* Signatures */}
                            <Grid container sx={{ mt: 8, textAlign: 'center' }}>
                                <Grid size={6}>
                                    <Typography sx={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN A</Typography>
                                    <Typography sx={{ fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</Typography>
                                    <Box sx={{ height: 100 }} />
                                    <Typography>Quản Lý</Typography>
                                </Grid>
                                <Grid size={6}>
                                    <Typography sx={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN B</Typography>
                                    <Typography sx={{ fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</Typography>
                                    <Box sx={{ height: 100 }} />
                                    <Typography>{watch("tenantInfo.fullName") || "..."}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Box>
                )}

                <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'white', p: 2, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: 2, zIndex: 1000 }}>
                    <Button variant="outlined" onClick={() => activeStep === 0 ? navigate("/contracts") : handleBack()}>
                        {activeStep === 0 ? "Hủy bỏ" : "Quay lại"}
                    </Button>

                    {activeStep === 0 ? (
                        <Button variant="contained" onClick={handleNext} size="large">Tiếp tục</Button>
                    ) : (
                        <Button type="submit" variant="contained" color="primary" size="large">Xác nhận & Tạo Hợp Đồng</Button>
                    )}
                </Box>
            </Container>
        </form>
    );
};

export default CreateContract;
