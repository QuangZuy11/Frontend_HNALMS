import { useState, useEffect, useRef } from "react";
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
    IconButton,
    CircularProgress,
} from "@mui/material";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
// Mock API URL - Replace with actual
const API_URL = "http://localhost:9999/api";



interface CoResident {
    fullName: string;
    cccd: string;
}

interface ServiceItem {
    _id: string;
    name: string;
    currentPrice: number;
    type: string;
    description?: string;
}

interface SelectedService {
    serviceId: string;
    name: string;
    price: number;
    type: string;
}

interface ContractFormValues {
    roomId: string;
    startDate: string;
    duration: number;
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

    // Pre-fill from navigation state (e.g., from Floor Map or Deposit)
    const preFilledRoomId = location.state?.roomId;
    const preFilledDepositId = location.state?.depositId;


    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [roomDevices, setRoomDevices] = useState<any[]>([]);
    const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [contractImages, setContractImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { control, handleSubmit, watch, setValue, register, formState: { errors } } = useForm<ContractFormValues>({
        mode: "onChange",
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
        }
    });

    const { fields: coResidentFields, append: appendCoResident, remove: removeCoResident } = useFieldArray({
        control,
        name: "coResidents"
    });

    // Fetch Rooms and Services on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roomsRes, servicesRes] = await Promise.all([
                    axios.get(`${API_URL}/rooms`),
                    axios.get(`${API_URL}/services?type=Fixed&isActive=true`)
                ]);

                // Show all rooms (Occupied ones should be styled differently and unselectable)
                const rawRooms = roomsRes.data.data || [];

                // Map to match component expectations (FloorMap expects price, handleSelect expects price)
                const mappedRooms = rawRooms.map((room: any) => ({
                    ...room,
                    price: room.roomTypeId?.currentPrice || 0,
                    floorLabel: room.floorId?.name || "N/A"
                }));

                setRooms(mappedRooms);

                // Set available monthly services
                const services = servicesRes.data.data || [];
                setAvailableServices(services);
                // Auto-select all services
                setSelectedServices(services.map((s: ServiceItem) => ({
                    serviceId: s._id,
                    name: s.name,
                    price: s.currentPrice,
                    type: s.type
                })));

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

    const handleRoomSelect = async (roomData: any) => {
        // Prevent selecting Occupied rooms
        if (roomData.status === "Occupied" || roomData.status === "Đang thuê") {
            alert("Phòng này đã có người thuê! Vui lòng chọn phòng Trống hoặc Đã cọc.");
            return;
        }

        try {
            // Fetch full room details to get devices
            const res = await axios.get(`${API_URL}/rooms/${roomData._id}`);
            const fullRoom = res.data.data;

            setSelectedRoom(fullRoom);
            setValue("roomId", fullRoom._id);

            // Map devices from API response (read-only display)
            console.log("Room details fetched:", fullRoom);
            if (fullRoom.assets && fullRoom.assets.length > 0) {
                console.log("Devices found:", fullRoom.assets);
                const mappedDevices = fullRoom.assets.map((a: any) => ({
                    name: a.deviceId?.name || "Thiết bị",
                    brand: a.deviceId?.brand || "",
                    model: a.deviceId?.model || "",
                    quantity: a.quantity || 1,
                    condition: a.condition || "Tốt",
                    unit: a.deviceId?.unit || "cái",
                }));
                setRoomDevices(mappedDevices);
            } else {
                console.log("No devices found in room details.");
                setRoomDevices([]);
            }

        } catch (error) {
            console.error("Error fetching room details:", error);
            setSelectedRoom(roomData);
            setValue("roomId", roomData._id);
            setRoomDevices([]);
        }
    };

    const watchRoomId = watch("roomId");
    useEffect(() => {
        if (watchRoomId && rooms.length > 0) {
            const room = rooms.find((r: any) => r._id === watchRoomId);
            if (room) handleRoomSelect(room);
        }
    }, [watchRoomId, rooms]);

    // Service toggle handler
    const handleServiceToggle = (service: ServiceItem) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.serviceId === service._id);
            if (exists) {
                return prev.filter(s => s.serviceId !== service._id);
            } else {
                return [...prev, {
                    serviceId: service._id,
                    name: service.name,
                    price: service.currentPrice,
                    type: service.type
                }];
            }
        });
    };

    // Upload contract images handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remaining = 5 - contractImages.length;
        if (files.length > remaining) {
            alert(`Chỉ có thể tải thêm tối đa ${remaining} ảnh (đã có ${contractImages.length}/5 ảnh).`);
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("images", files[i]);
            }

            const res = await axios.post(`${API_URL}/contracts/upload-images`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.data.success) {
                setContractImages(prev => [...prev, ...res.data.data]);
            }
        } catch (err: any) {
            alert("Lỗi tải ảnh: " + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (index: number) => {
        setContractImages(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: any) => {
        try {
            const payload = {
                ...data,
                depositId: preFilledDepositId,
                contractDetails: {
                    startDate: data.startDate,
                    duration: Number(data.duration),
                    services: selectedServices,
                    paymentCycle: 1 // Default
                },

                images: contractImages,
            };

            const res = await axios.post(`${API_URL}/contracts/create`, payload);
            if (res.data.success) {
                alert(`Đã tạo hợp đồng thành công.\nĐã gửi tài khoản và mật khẩu đến email đăng ký: ${data.tenantInfo?.email || 'của khách hàng'}.`);
                // Redirect
                navigate("/manager/contracts");
            }
        } catch (err: any) {
            alert("Lỗi tạo hợp đồng: " + (err.response?.data?.message || err.message));
        }
    };



    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {/* CONTRACT DETAILS */}
                <Box>
                    {/* Contract Configuration Removed - Merged into Document */}

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
                                        <TextField variant="standard" fullWidth placeholder="Họ và tên..."
                                            {...register("tenantInfo.fullName", { required: "Họ và tên là bắt buộc" })}
                                            error={!!errors.tenantInfo?.fullName}
                                            helperText={errors.tenantInfo?.fullName?.message as string}
                                            InputProps={{ style: { fontSize: '1.1rem', fontWeight: 'bold' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Grid container alignItems="center">
                                            <Typography component="span" sx={{ mr: 1 }}>Sinh ngày:</Typography>
                                            <TextField variant="standard" type="date"
                                                {...register("tenantInfo.dob", { required: "Ngày sinh là bắt buộc" })}
                                                error={!!errors.tenantInfo?.dob}
                                                helperText={errors.tenantInfo?.dob?.message as string}
                                                InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                        </Grid>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Grid container alignItems="center">
                                            <Typography component="span" sx={{ mr: 1 }}>CCCD/CMND:</Typography>
                                            <TextField variant="standard" fullWidth placeholder="Số CCCD..."
                                                {...register("tenantInfo.cccd", {
                                                    required: "CCCD là bắt buộc",
                                                    pattern: { value: /^[0-9]{12}$/, message: "CCCD phải gồm đúng 12 chữ số" }
                                                })}
                                                error={!!errors.tenantInfo?.cccd}
                                                helperText={errors.tenantInfo?.cccd?.message as string}
                                                InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                        </Grid>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Grid container alignItems="center">
                                            <Typography component="span" sx={{ mr: 1 }}>Điện thoại:</Typography>
                                            <TextField variant="standard" fullWidth placeholder="SĐT liên hệ..."
                                                {...register("tenantInfo.phone", {
                                                    required: "Số điện thoại là bắt buộc",
                                                    pattern: { value: /^0[0-9]{9}$/, message: "SĐT phải gồm 10 chữ số, bắt đầu bằng 0" }
                                                })}
                                                error={!!errors.tenantInfo?.phone}
                                                helperText={errors.tenantInfo?.phone?.message as string}
                                                InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                        </Grid>
                                    </Grid>
                                    <Grid size={12}>
                                        <Grid container alignItems="center">
                                            <Typography component="span" sx={{ mr: 1 }}>Email:</Typography>
                                            <TextField variant="standard" fullWidth placeholder="Email nhận thông báo..."
                                                {...register("tenantInfo.email", {
                                                    required: "Email là bắt buộc",
                                                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email không đúng định dạng" }
                                                })}
                                                error={!!errors.tenantInfo?.email}
                                                helperText={errors.tenantInfo?.email?.message as string}
                                                InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                        </Grid>
                                    </Grid>
                                    <Grid size={12}>
                                        <Grid container alignItems="center">
                                            <Typography component="span" sx={{ mr: 1 }}>Hộ khẩu thường trú:</Typography>
                                            <TextField variant="standard" fullWidth placeholder="Địa chỉ..."
                                                {...register("tenantInfo.address", { required: "Hộ khẩu thường trú là bắt buộc" })}
                                                error={!!errors.tenantInfo?.address}
                                                helperText={errors.tenantInfo?.address?.message as string}
                                                InputProps={{ style: { fontSize: '1.1rem' } }} sx={{ flex: 1 }} />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Agreement */}
                            <Typography paragraph>
                                Hai bên cùng thỏa thuận ký kết hợp đồng thuê nhà với các điều khoản sau:
                            </Typography>

                            <Typography component="div" sx={{ mb: 2 }}>
                                <strong>Điều 1:</strong> Bên A đồng ý cho Bên B thuê phòng số <strong>{selectedRoom?.name || "..."}</strong>.
                                <br />
                                - Thời hạn thuê:
                                <TextField
                                    variant="standard"
                                    type="number"
                                    sx={{ width: 80, mx: 1 }}
                                    inputProps={{ style: { textAlign: 'center', fontWeight: 'bold' }, min: 6 }}
                                    {...register("duration", { required: "Bắt buộc", min: { value: 6, message: "Tối thiểu 6 tháng" }, valueAsNumber: true })}
                                    error={!!errors.duration}
                                    helperText={errors.duration?.message as string}
                                />
                                tháng, bắt đầu từ ngày
                                <TextField
                                    variant="standard"
                                    type="date"
                                    sx={{ mx: 1 }}
                                    {...register("startDate", { required: "Ngày bắt đầu là bắt buộc" })}
                                    error={!!errors.startDate}
                                    helperText={errors.startDate?.message as string}
                                />.
                                <br />
                                - Giá thuê phòng là:
                                <TextField
                                    variant="standard"
                                    type="text"
                                    sx={{ width: 120, mx: 1 }}
                                    inputProps={{ style: { textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' } }}
                                    InputProps={{ readOnly: true }}
                                    value={Number(selectedRoom?.roomTypeId?.currentPrice || selectedRoom?.price || 0).toLocaleString()}
                                />
                                VNĐ/tháng. (Giá này cố định theo loại phòng).
                                <br />
                                - Tiền đặt cọc:
                                <TextField
                                    variant="standard"
                                    type="text"
                                    sx={{ width: 120, mx: 1 }}
                                    inputProps={{ style: { textAlign: 'right', fontWeight: 'bold' } }}
                                    InputProps={{ readOnly: true }}
                                    value={Number(selectedRoom?.roomTypeId?.currentPrice || selectedRoom?.price || 0).toLocaleString()}
                                />
                                VNĐ (Tương đương 01 tháng tiền phòng).
                            </Typography>

                            <Typography component="div" sx={{ mb: 1 }}>
                                <strong>Điều 2:</strong> Các trang thiết bị/tài sản bàn giao kèm theo phòng:
                            </Typography>
                            <Box sx={{ pl: 3 }}>
                                {roomDevices.length > 0 ? (
                                    roomDevices.map((device, index) => (
                                        <Typography key={index} sx={{ fontFamily: '"Times New Roman", serif', fontSize: '1.1rem', mb: 0.5 }}>
                                            • {device.name} {device.brand ? `(${device.brand})` : ""} - SL: <strong>{device.quantity}</strong> {device.unit || "cái"} ({device.condition})
                                        </Typography>
                                    ))
                                ) : (
                                    <Typography sx={{ fontStyle: 'italic' }}>Chưa có thiết bị nào được ghi nhận.</Typography>
                                )}
                            </Box>

                            <Typography paragraph sx={{ mt: 2 }}>
                                <strong>Điều 3:</strong> Các dịch vụ hàng tháng đi kèm:
                            </Typography>
                            <Grid container spacing={1} sx={{ pl: 3 }}>
                                {availableServices.length > 0 ? (
                                    availableServices.map((service) => {
                                        const selected = selectedServices.find(s => s.serviceId === service._id);
                                        return (
                                            <Grid size={{ xs: 12, md: 6 }} key={service._id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={!!selected}
                                                                onChange={() => handleServiceToggle(service)}
                                                            />
                                                        }
                                                        label={
                                                            <Typography sx={{ fontFamily: '"Times New Roman", serif', fontSize: '1.1rem' }}>
                                                                {service.name} - <strong>{service.currentPrice.toLocaleString()}</strong> VNĐ/tháng
                                                            </Typography>
                                                        }
                                                    />
                                                </Box>
                                            </Grid>
                                        );
                                    })
                                ) : (
                                    <Typography sx={{ pl: 2, fontStyle: 'italic' }}>Chưa có dịch vụ hàng tháng nào được cấu hình.</Typography>
                                )}
                            </Grid>

                            <Typography paragraph sx={{ mt: 2 }}>
                                <strong>Điều 4:</strong> Danh sách người ở cùng (tối đa {(selectedRoom?.roomTypeId?.personMax || 1)} người/phòng):
                            </Typography>
                            <Box sx={{ pl: 3 }}>
                                {coResidentFields.map((item, index) => (
                                    <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'flex-end' }}>
                                        <Typography>{index + 1}.</Typography>
                                        <TextField variant="standard" placeholder="Họ tên"
                                            {...register(`coResidents.${index}.fullName` as const, { required: "Bắt buộc" })}
                                            error={!!errors.coResidents?.[index]?.fullName}
                                            helperText={errors.coResidents?.[index]?.fullName?.message as string}
                                        />
                                        <TextField variant="standard" placeholder="CCCD"
                                            {...register(`coResidents.${index}.cccd` as const, {
                                                required: "Bắt buộc",
                                                pattern: { value: /^[0-9]{12}$/, message: "CCCD 12 số" }
                                            })}
                                            error={!!errors.coResidents?.[index]?.cccd}
                                            helperText={errors.coResidents?.[index]?.cccd?.message as string}
                                        />
                                        <Button size="small" color="error" onClick={() => removeCoResident(index)}>X</Button>
                                    </Box>
                                ))}
                                <Button
                                    size="small"
                                    onClick={() => appendCoResident({ fullName: "", cccd: "" })}
                                    startIcon={<PersonAddIcon />}
                                    disabled={coResidentFields.length + 1 >= (selectedRoom?.roomTypeId?.personMax || 1)}
                                >
                                    Thêm người ở ({coResidentFields.length + 1}/{selectedRoom?.roomTypeId?.personMax || 1})
                                </Button>
                                {coResidentFields.length + 1 >= (selectedRoom?.roomTypeId?.personMax || 1) && (
                                    <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                                        Đã đạt giới hạn số người cho loại phòng này.
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Contract Image Upload */}
                        <Box sx={{ mt: 4, pt: 3, borderTop: '2px solid #1976d2' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 2 }}>
                                📷 Ảnh Hợp Đồng Bản Cứng
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Tải lên ảnh chụp hợp đồng đã ký (tối đa 5 ảnh). Hỗ trợ: JPG, PNG, JPEG, WebP.
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <input
                                    type="file"
                                    accept="image/jpg,image/jpeg,image/png,image/webp"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleImageUpload}
                                />
                                <Button
                                    variant="outlined"
                                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || contractImages.length >= 5}
                                    sx={{ borderStyle: 'dashed', px: 3, py: 1.5 }}
                                >
                                    {uploading ? 'Đang tải lên...' : `Tải ảnh lên (${contractImages.length}/5)`}
                                </Button>
                            </Box>

                            {/* Image Preview Grid */}
                            {contractImages.length > 0 && (
                                <Grid container spacing={2}>
                                    {contractImages.map((url, index) => (
                                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    border: '1px solid #ddd',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    '&:hover .delete-btn': { opacity: 1 }
                                                }}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Hợp đồng ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: 180,
                                                        objectFit: 'cover',
                                                        display: 'block'
                                                    }}
                                                />
                                                <IconButton
                                                    className="delete-btn"
                                                    size="small"
                                                    onClick={() => handleRemoveImage(index)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: 'rgba(255,255,255,0.9)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                        '&:hover': { bgcolor: '#ffebee', color: '#d32f2f' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: 'block',
                                                        textAlign: 'center',
                                                        py: 0.5,
                                                        bgcolor: '#f5f5f5'
                                                    }}
                                                >
                                                    Ảnh {index + 1}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    </Paper>
                </Box>

                <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'white', p: 2, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: 2, zIndex: 1000 }}>
                    <Button variant="outlined" onClick={() => navigate("/manager/contracts")}>
                        Hủy bỏ
                    </Button>
                    <Button type="submit" variant="contained" color="primary" size="large">Xác nhận & Tạo Hợp Đồng</Button>
                </Box>
            </Container>
        </form>
    );
};

export default CreateContract;
