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
  Modal,
  Backdrop,
  Chip,
  MenuItem,
} from "@mui/material";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import DeleteIcon from "@mui/icons-material/Delete";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale/vi";
import { format as formatDate } from "date-fns";
import CloseIcon from "@mui/icons-material/Close";

// Mock API URL - Replace with actual
const API_URL = "http://localhost:9999/api";

// Self-contained Deposit Modal that fetches data on-demand
function DepositModal({
  open,
  onClose,
  depositId,
  roomId,
  serifFont,
}: {
  open: boolean;
  onClose: () => void;
  depositId?: any;
  roomId?: string;
  serifFont: string;
}) {
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!depositId && !roomId) return;

    // If depositId is already a populated object (has name field), use it directly
    if (depositId && typeof depositId === "object" && depositId.name) {
      setDeposit(depositId);
      return;
    }

    // Otherwise, fetch from API using the string ID or roomId
    setLoading(true);
    axios
      .get(`${API_URL}/deposits`)
      .then((res) => {
        if (res.data.success) {
          let found = null;
          if (depositId) {
            const id =
              typeof depositId === "string"
                ? depositId
                : depositId._id || depositId;
            found = res.data.data.find((d: any) => d._id === id);
          } else if (roomId) {
            // Find active "Held" deposit for this room
            found = res.data.data.find(
              (d: any) =>
                (d.room === roomId || d.room?._id === roomId) &&
                d.status === "Held",
            );
          }
          setDeposit(found || null);
        }
      })
      .catch((err) => console.error("Error fetching deposit:", err))
      .finally(() => setLoading(false));
  }, [open, depositId, roomId]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "Held":
        return "Đang giữ";
      case "Refunded":
        return "Đã hoàn";
      case "Forfeited":
        return "Đã phạt";
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Held":
        return "primary";
      case "Refunded":
        return "success";
      default:
        return "error";
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              fontSize: "1.2rem",
              fontFamily: serifFont,
            }}
          >
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              fontFamily: serifFont,
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Người cọc:
              </Typography>
              <Typography sx={{ fontWeight: 600, fontFamily: serifFont }}>
                {deposit.name || "—"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Số điện thoại:
              </Typography>
              <Typography sx={{ fontFamily: serifFont }}>
                {deposit.phone || "—"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Email:
              </Typography>
              <Typography sx={{ fontFamily: serifFont }}>
                {deposit.email || "—"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Số tiền cọc:
              </Typography>
              <Typography
                sx={{
                  fontWeight: 600,
                  color: "#d32f2f",
                  fontFamily: serifFont,
                }}
              >
                {(deposit.amount || 0).toLocaleString("vi-VN")} VNĐ
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Trạng thái:
              </Typography>
              <Chip
                label={statusLabel(deposit.status)}
                color={statusColor(deposit.status) as any}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                sx={{ color: "#666", minWidth: 120, fontFamily: serifFont }}
              >
                Ngày cọc:
              </Typography>
              <Typography sx={{ fontFamily: serifFont }}>
                {deposit.createdAt
                  ? new Date(deposit.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
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

// Category: fixed_monthly (Thang máy, Vệ Sinh, Điện, Nước), quantity_based (các dịch vụ còn lại)
type ServiceCategory = "fixed_monthly" | "quantity_based";

interface SelectedService {
  serviceId: string;
  name: string;
  price: number;
  type: string;
  category: ServiceCategory;
  quantity: number;
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
  prepayMonths: number | string;
}

const CreateContract = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-fill from navigation state (e.g., from Floor Map or Deposit)
  const preFilledRoomId = location.state?.roomId;
  const preFilledDepositId = location.state?.depositId;

  // Restore saved form data from sessionStorage (when returning from deposit creation)
  const savedDraft = (() => {
    try {
      const raw = sessionStorage.getItem("contractFormDraft");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomDevices, setRoomDevices] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    savedDraft?.selectedServices || [],
  );
  const [vehicleQuantities, setVehicleQuantities] = useState<
    Record<string, number>
  >(savedDraft?.vehicleQuantities || {});
  const [contractImages, setContractImages] = useState<string[]>(
    savedDraft?.contractImages || [],
  );
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    register,
    formState: { errors },
  } = useForm<ContractFormValues>({
    mode: "onChange",
    defaultValues: savedDraft?.formValues || {
      roomId: preFilledRoomId || "",
      startDate: new Date().toISOString().split("T")[0],
      duration: 12,
      prepayMonths: 2,
      tenantInfo: {
        fullName: "",
        dob: "",
        cccd: "",
        address: "",
        phone: "",
        email: "",
        gender: "Male",
        contactRef: "", // Bố mẹ
      },
      coResidents: [],
    },
  });

  const {
    fields: coResidentFields,
    append: appendCoResident,
    remove: removeCoResident,
  } = useFieldArray({
    control,
    name: "coResidents",
  });

  // Clear saved draft after restoring
  useEffect(() => {
    if (savedDraft) {
      sessionStorage.removeItem("contractFormDraft");
    }
  }, []);

  // Fetch Rooms and Services on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, servicesRes] = await Promise.all([
          axios.get(`${API_URL}/rooms`),
          axios.get(`${API_URL}/services?isActive=true`),
        ]);

        // Show all rooms (Occupied ones should be styled differently and unselectable)
        const rawRooms = roomsRes.data.data || [];

        // Map to match component expectations (FloorMap expects price, handleSelect expects price)
        const mappedRooms = rawRooms.map((room: any) => ({
          ...room,
          price: room.roomTypeId?.currentPrice || 0,
          floorLabel: room.floorId?.name || "N/A",
        }));

        setRooms(mappedRooms);

        // Set available monthly services
        const services = servicesRes.data.data || [];
        setAvailableServices(services);
        // Note: We don't auto-select all services here anymore. The useEffect will enforce mandatory ones depending on the selected room.

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
      alert(
        "Phòng này đã có người thuê! Vui lòng chọn phòng Trống hoặc Đã cọc.",
      );
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

  // Helper: determine service category by name
  const getServiceCategory = (serviceName: string): ServiceCategory => {
    const n = serviceName.toLowerCase();
    // "Xe máy điện" chứa "điện" nhưng là dịch vụ xe, không phải điện năng
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

  // Helper: get display unit for a fixed service
  const getServiceUnit = (serviceName: string): string => {
    const n = serviceName.toLowerCase();
    if (n.includes("điện")) return "VNĐ/kWh";
    if (n.includes("nước")) return "VNĐ/m³";
    return "VNĐ/tháng";
  };

  // Helper: get floor number of selected room
  const getRoomFloorNumber = (): number => {
    const floorName =
      selectedRoom?.floorId?.name || selectedRoom?.floorLabel || "";
    const match = floorName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Helper: check if a service should be excluded based on room floor
  const isServiceExcludedForRoom = (serviceName: string): boolean => {
    const n = serviceName.toLowerCase();
    // Tầng 1 không cần dịch vụ thang máy
    if (
      (n.includes("thang máy") || n.includes("elevator")) &&
      getRoomFloorNumber() === 1
    ) {
      return true;
    }
    return false;
  };

  // Helper: check if a quantity_based service needs quantity input
  const needsQuantityInput = (serviceName: string): boolean => {
    const n = serviceName.toLowerCase();
    // Máy giặt chỉ cần tick chọn, không cần nhập số lượng
    if (n.includes("máy giặt")) return false;
    return true;
  };

  // Helper: check if a fixed_monthly service is charged per person
  const isPerPersonService = (serviceName: string): boolean => {
    const n = serviceName.toLowerCase();
    return (
      n.includes("internet") || n.includes("wifi") || n.includes("vệ sinh")
    );
  };

  // Helper: sort order for fixed monthly services
  const getFixedServiceSortOrder = (serviceName: string): number => {
    const n = serviceName.toLowerCase();
    if (n.includes("điện")) return 1;
    if (n.includes("nước")) return 2;
    if (n.includes("internet") || n.includes("wifi")) return 3;
    if (n.includes("vệ sinh")) return 4;
    return 99;
  };

  // Enforce mandatory services based on room selection
  useEffect(() => {
    if (!selectedRoom || availableServices.length === 0) return;

    setSelectedServices((prev) => {
      let newSelected = [...prev];

      availableServices.forEach((service) => {
        const category = getServiceCategory(service.name);

        // fixed_monthly services are always included (mandatory)
        // But skip excluded services (e.g., elevator for floor 1)
        if (
          category === "fixed_monthly" &&
          !isServiceExcludedForRoom(service.name)
        ) {
          const existIdx = newSelected.findIndex(
            (s) => s.serviceId === service._id,
          );
          if (existIdx < 0) {
            newSelected.push({
              serviceId: service._id,
              name: service.name,
              price: service.currentPrice,
              type: service.type,
              category,
              quantity: 1,
            });
          }
        }
        // quantity_based are optional, don't auto-add
      });

      // Remove excluded services (e.g., elevator when switching to floor 1)
      newSelected = newSelected.filter(
        (s) => !isServiceExcludedForRoom(s.name),
      );

      return newSelected;
    });
  }, [selectedRoom, availableServices]);

  // Service toggle handler (only for quantity_based / vehicle services)
  const handleServiceToggle = (service: ServiceItem) => {
    const category = getServiceCategory(service.name);
    if (category !== "quantity_based") return; // Can't toggle mandatory ones

    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === service._id);
      if (exists) {
        return prev.filter((s) => s.serviceId !== service._id);
      } else {
        return [
          ...prev,
          {
            serviceId: service._id,
            name: service.name,
            price: service.currentPrice,
            type: service.type,
            category,
            quantity: vehicleQuantities[service._id] || 1,
          },
        ];
      }
    });
  };

  // Handle vehicle quantity change
  const handleVehicleQuantityChange = (serviceId: string, qty: number) => {
    const val = Math.max(1, qty);
    setVehicleQuantities((prev) => ({ ...prev, [serviceId]: val }));
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity: val } : s,
      ),
    );
  };

  // FPT.AI OCR upload handler
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", files[0]);

      const res = await axios.post(
        "https://api.fpt.ai/vision/idr/vnm",
        formData,
        {
          headers: {
            "api-key": "UJ4VXI9R2N49AIyl2TCnofOH31cJP4Rw",
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (
        res.data?.errorCode === 0 &&
        res.data?.data &&
        res.data.data.length > 0
      ) {
        const data = res.data.data[0];

        // Set fields
        if (data.name)
          setValue("tenantInfo.fullName", data.name, { shouldValidate: true });
        if (data.id)
          setValue("tenantInfo.cccd", data.id, { shouldValidate: true });
        if (data.address || data.home)
          setValue("tenantInfo.address", data.address || data.home, {
            shouldValidate: true,
          });

        if (data.sex) {
          const sexLower = data.sex.toLowerCase();
          if (sexLower.includes("nam")) {
            setValue("tenantInfo.gender", "Male", { shouldValidate: true });
          } else if (sexLower.includes("nữ")) {
            setValue("tenantInfo.gender", "Female", { shouldValidate: true });
          }
        }

        if (data.dob) {
          // Format from DD/MM/YYYY to YYYY-MM-DD
          const parts = data.dob.split("/");
          if (parts.length === 3) {
            const formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
            setValue("tenantInfo.dob", formattedDob, { shouldValidate: true });
          }
        }
        alert("Đã nhận diện và điền tự động dữ liệu CCCD thành công!");
      } else {
        alert("Không thể nhận diện CCCD. Vui lòng thử lại với ảnh rõ nét hơn.");
      }
    } catch (err: any) {
      console.error("OCR Error:", err);
      alert(
        "Lỗi khi kết nối tới FPT.AI: " +
          (err.response?.data?.errorMessage || err.message),
      );
    } finally {
      setOcrLoading(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
    }
  };

  // Upload contract images handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - contractImages.length;
    if (files.length > remaining) {
      alert(
        `Chỉ có thể tải thêm tối đa ${remaining} ảnh (đã có ${contractImages.length}/5 ảnh).`,
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }

      const res = await axios.post(
        `${API_URL}/contracts/upload-images`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.success) {
        setContractImages((prev) => [...prev, ...res.data.data]);
        setImageError(false);
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
    setContractImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    // Validate: phòng phải đã đặt cọc
    if (selectedRoom?.status !== "Deposited") {
      alert(
        "Phòng chưa được đặt cọc! Vui lòng tạo cọc trước khi tạo hợp đồng.",
      );
      return;
    }

    // Validate: phải có ít nhất 1 ảnh hợp đồng bản cứng
    if (contractImages.length === 0) {
      setImageError(true);
      // Scroll đến khu vực upload ảnh
      fileInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setSubmitting(true);
    try {
      let rentPaidUntil = null;
      if (data.prepayMonths) {
        const start = new Date(data.startDate);
        const monthsToAdd = data.prepayMonths === "all" ? Number(data.duration) : Number(data.prepayMonths);
        rentPaidUntil = new Date(start.getFullYear(), start.getMonth() + 1 + monthsToAdd, 0).toISOString();
      }

      const payload = {
        ...data,
        rentPaidUntil,
        contractDetails: {
          startDate: data.startDate,
          duration: Number(data.duration),
          paymentCycle: 1,
        },
        // bookServices for the separate bookservices collection
        // quantity_based: use selected quantity; per-person fixed (Internet, Vệ Sinh): use person count
        bookServices: selectedServices.map((s) => {
          const entry: any = { serviceId: s.serviceId, category: s.category };
          if (s.category === "quantity_based") {
            entry.quantity = s.quantity;
          } else if (isPerPersonService(s.name)) {
            entry.quantity = (data.coResidents?.length || 0) + 1;
          }
          return entry;
        }),
        images: contractImages,
      };

      const res = await axios.post(`${API_URL}/contracts/create`, payload);
      if (res.data.success) {
        sessionStorage.removeItem("contractFormDraft");
        alert(res.data.message);
        // Redirect
        navigate("/manager/contracts");
      }
    } catch (err: any) {
      alert(
        "Lỗi tạo hợp đồng: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* CONTRACT DETAILS */}
          <Box>
            {/* Contract Configuration Removed - Merged into Document */}

            {/* Paper Document Representation */}
            <Paper
              elevation={3}
              sx={{
                p: 5,
                minHeight: "800px",
                mx: "auto",
                maxWidth: "900px",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              {/* Header */}
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography
                  variant="h5"
                  sx={{ textTransform: "uppercase", fontWeight: "bold" }}
                >
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", textDecoration: "underline" }}
                >
                  Độc lập - Tự do - Hạnh phúc
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ mt: 3, fontWeight: "bold", textTransform: "uppercase" }}
                >
                  HỢP ĐỒNG THUÊ NHÀ
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: "italic", mt: 1 }}>
                  (Số: {selectedRoom ? `HĐ-${selectedRoom.name}` : "..."}/...)
                </Typography>
              </Box>

              {/* Body */}
              <Box sx={{ lineHeight: 2, fontSize: "1.1rem" }}>
                <Typography paragraph>
                  Hôm nay, ngày {new Date().getDate()} tháng{" "}
                  {new Date().getMonth() + 1} năm {new Date().getFullYear()},
                  tại địa chỉ quản lý tòa nhà.
                </Typography>
                <Typography paragraph sx={{ fontWeight: "bold" }}>
                  Chúng tôi gồm có:
                </Typography>

                {/* BEN A */}
                <Box sx={{ mb: 2 }}>
                  <Typography
                    sx={{ fontWeight: "bold", textDecoration: "underline" }}
                  >
                    BÊN A (Bên cho thuê):
                  </Typography>
                  <Typography>
                    Ông/Bà: <strong>QUẢN LÝ TÒA NHÀ HOÀNG NAM</strong>
                  </Typography>
                  <Typography>Đại diện cho chủ sở hữu căn hộ.</Typography>
                </Box>

                {/* BEN B */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{ fontWeight: "bold", textDecoration: "underline" }}
                    >
                      BÊN B (Bên thuê):
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => ocrFileInputRef.current?.click()}
                      disabled={ocrLoading}
                      sx={{
                        fontFamily: '"Times New Roman", serif',
                        fontSize: "0.9rem",
                        textTransform: "none",
                        color: "#333",
                        borderColor: "#333",
                        borderStyle: "dashed",
                        px: 2,
                        py: 0.5,
                        "&:hover": {
                          borderColor: "#000",
                          bgcolor: "#fafafa",
                        },
                      }}
                    >
                      {ocrLoading ? (
                        <>
                          <CircularProgress
                            size={14}
                            sx={{ mr: 1, color: "#333" }}
                          />
                          Đang nhận diện...
                        </>
                      ) : (
                        "Quét CCCD (Tự động điền)"
                      )}
                    </Button>
                    <input
                      type="file"
                      accept="image/jpg,image/jpeg,image/png"
                      ref={ocrFileInputRef}
                      style={{ display: "none" }}
                      onChange={handleOcrUpload}
                    />
                  </Box>
                  <Grid container spacing={1} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        variant="standard"
                        fullWidth
                        placeholder="Họ và tên..."
                        {...register("tenantInfo.fullName", {
                          required: "Họ và tên là bắt buộc",
                        })}
                        error={!!errors.tenantInfo?.fullName}
                        helperText={
                          errors.tenantInfo?.fullName?.message as string
                        }
                        InputProps={{
                          style: { fontSize: "1.1rem", fontWeight: "bold" },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Grid container alignItems="center">
                        <Typography component="span" sx={{ mr: 1 }}>
                          Sinh ngày:
                        </Typography>
                        <Controller
                          name="tenantInfo.dob"
                          control={control}
                          rules={{ required: "Ngày sinh là bắt buộc" }}
                          render={({ field }) => (
                            <DatePicker
                              value={field.value ? new Date(field.value) : null}
                              onChange={(date) => {
                                if (date && !isNaN(date.getTime())) {
                                  field.onChange(
                                    formatDate(date, "yyyy-MM-dd"),
                                  );
                                } else {
                                  field.onChange("");
                                }
                              }}
                              format="dd/MM/yyyy"
                              slotProps={{
                                textField: {
                                  variant: "standard",
                                  error: !!errors.tenantInfo?.dob,
                                  helperText: errors.tenantInfo?.dob
                                    ?.message as string,
                                  InputProps: {
                                    style: { fontSize: "1.1rem" },
                                  },
                                  sx: { flex: 1 },
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Grid container alignItems="center">
                        <Typography component="span" sx={{ mr: 1 }}>
                          CCCD/CMND:
                        </Typography>
                        <TextField
                          variant="standard"
                          fullWidth
                          placeholder="Số CCCD..."
                          {...register("tenantInfo.cccd", {
                            required: "CCCD là bắt buộc",
                            pattern: {
                              value: /^[0-9]{12}$/,
                              message: "CCCD phải gồm đúng 12 chữ số",
                            },
                          })}
                          error={!!errors.tenantInfo?.cccd}
                          helperText={
                            errors.tenantInfo?.cccd?.message as string
                          }
                          InputProps={{ style: { fontSize: "1.1rem" } }}
                          sx={{ flex: 1 }}
                        />
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Grid container alignItems="center">
                        <Typography component="span" sx={{ mr: 1 }}>
                          Điện thoại:
                        </Typography>
                        <TextField
                          variant="standard"
                          fullWidth
                          placeholder="SĐT liên hệ..."
                          {...register("tenantInfo.phone", {
                            required: "Số điện thoại là bắt buộc",
                            pattern: {
                              value: /^0[0-9]{9}$/,
                              message: "SĐT phải gồm 10 chữ số, bắt đầu bằng 0",
                            },
                          })}
                          error={!!errors.tenantInfo?.phone}
                          helperText={
                            errors.tenantInfo?.phone?.message as string
                          }
                          InputProps={{ style: { fontSize: "1.1rem" } }}
                          sx={{ flex: 1 }}
                        />
                      </Grid>
                    </Grid>
                    <Grid size={12}>
                      <Grid container alignItems="center">
                        <Typography component="span" sx={{ mr: 1 }}>
                          Email:
                        </Typography>
                        <TextField
                          variant="standard"
                          fullWidth
                          placeholder="Email nhận thông báo..."
                          {...register("tenantInfo.email", {
                            required: "Email là bắt buộc",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Email không đúng định dạng",
                            },
                          })}
                          error={!!errors.tenantInfo?.email}
                          helperText={
                            errors.tenantInfo?.email?.message as string
                          }
                          InputProps={{ style: { fontSize: "1.1rem" } }}
                          sx={{ flex: 1 }}
                        />
                      </Grid>
                    </Grid>
                    <Grid size={12}>
                      <Grid container alignItems="center">
                        <Typography component="span" sx={{ mr: 1 }}>
                          Hộ khẩu thường trú:
                        </Typography>
                        <TextField
                          variant="standard"
                          fullWidth
                          placeholder="Địa chỉ..."
                          {...register("tenantInfo.address", {
                            required: "Hộ khẩu thường trú là bắt buộc",
                          })}
                          error={!!errors.tenantInfo?.address}
                          helperText={
                            errors.tenantInfo?.address?.message as string
                          }
                          InputProps={{ style: { fontSize: "1.1rem" } }}
                          sx={{ flex: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>

                {/* Danh sách người ở cùng - trước thỏa thuận */}
                <Typography
                  paragraph
                  sx={{
                    mt: 2,
                    fontFamily: '"Times New Roman", serif',
                    fontSize: "1.1rem",
                  }}
                >
                  <strong>Danh sách người ở cùng trong phòng</strong> (tối đa{" "}
                  {selectedRoom?.roomTypeId?.personMax || 1} người/phòng):
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {coResidentFields.length > 0 ? (
                    <Box
                      component="table"
                      sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: '"Times New Roman", serif',
                        fontSize: "1.05rem",
                        mb: 1.5,
                      }}
                    >
                      <Box component="thead">
                        <Box component="tr">
                          {["STT", "Họ và tên", "Số CCCD/CMND", ""].map((h) => (
                            <Box
                              component="th"
                              key={h || "action"}
                              sx={{
                                border: h ? "1px solid #333" : "none",
                                py: 0.8,
                                px: 1.5,
                                textAlign: "center",
                                fontWeight: "bold",
                                bgcolor: h ? "#fafafa" : "transparent",
                                fontFamily: '"Times New Roman", serif',
                                width: h === "" ? "40px" : "auto",
                              }}
                            >
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {coResidentFields.map((item, index) => (
                          <Box component="tr" key={item.id}>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.3,
                                px: 1.5,
                                textAlign: "center",
                                fontFamily: '"Times New Roman", serif',
                                width: "50px",
                              }}
                            >
                              {index + 1}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.3,
                                px: 1,
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              <TextField
                                variant="standard"
                                fullWidth
                                placeholder="Họ và tên..."
                                {...register(
                                  `coResidents.${index}.fullName` as const,
                                  { required: "Bắt buộc" },
                                )}
                                error={!!errors.coResidents?.[index]?.fullName}
                                helperText={
                                  errors.coResidents?.[index]?.fullName
                                    ?.message as string
                                }
                                InputProps={{
                                  disableUnderline: true,
                                  style: {
                                    fontSize: "1.05rem",
                                    fontFamily: '"Times New Roman", serif',
                                  },
                                }}
                              />
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.3,
                                px: 1,
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <TextField
                                  variant="standard"
                                  fullWidth
                                  placeholder="Số CCCD..."
                                  {...register(
                                    `coResidents.${index}.cccd` as const,
                                    {
                                      required: "Bắt buộc",
                                      pattern: {
                                        value: /^[0-9]{12}$/,
                                        message: "CCCD phải gồm 12 chữ số",
                                      },
                                    },
                                  )}
                                  error={!!errors.coResidents?.[index]?.cccd}
                                  helperText={
                                    errors.coResidents?.[index]?.cccd
                                      ?.message as string
                                  }
                                  InputProps={{
                                    disableUnderline: true,
                                    style: {
                                      fontSize: "1.05rem",
                                      fontFamily: '"Times New Roman", serif',
                                    },
                                  }}
                                  sx={{ flex: 1 }}
                                />
                                <input
                                  type="file"
                                  accept="image/jpg,image/jpeg,image/png"
                                  style={{ display: "none" }}
                                  id={`coResident-ocr-input-${index}`}
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (!files || files.length === 0) return;
                                    const formData = new FormData();
                                    formData.append("image", files[0]);
                                    try {
                                      const res = await axios.post(
                                        "https://api.fpt.ai/vision/idr/vnm",
                                        formData,
                                        {
                                          headers: {
                                            "api-key":
                                              "UJ4VXI9R2N49AIyl2TCnofOH31cJP4Rw",
                                            "Content-Type":
                                              "multipart/form-data",
                                          },
                                        },
                                      );
                                      if (
                                        res.data?.errorCode === 0 &&
                                        res.data?.data &&
                                        res.data.data.length > 0
                                      ) {
                                        const data = res.data.data[0];
                                        if (data.name)
                                          setValue(
                                            `coResidents.${index}.fullName`,
                                            data.name,
                                            { shouldValidate: true },
                                          );
                                        if (data.id)
                                          setValue(
                                            `coResidents.${index}.cccd`,
                                            data.id,
                                            { shouldValidate: true },
                                          );
                                        alert(
                                          "Đã nhận diện và điền tự động dữ liệu CCCD thành công!",
                                        );
                                      } else {
                                        alert(
                                          "Không thể nhận diện CCCD. Vui lòng thử lại với ảnh rõ nét hơn.",
                                        );
                                      }
                                    } catch (err) {
                                      alert(
                                        "Lỗi khi kết nối tới FPT.AI: " +
                                          (err.response?.data?.errorMessage ||
                                            err.message),
                                      );
                                    }
                                    // Reset file input
                                    document.getElementById(
                                      `coResident-ocr-input-${index}`,
                                    ).value = "";
                                  }}
                                />
                                <label
                                  htmlFor={`coResident-ocr-input-${index}`}
                                >
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      fontFamily: '"Times New Roman", serif',
                                      fontSize: "0.9rem",
                                      textTransform: "none",
                                      color: "#333",
                                      borderColor: "#333",
                                      borderStyle: "dashed",
                                      px: 1.5,
                                      py: 0.5,
                                      minWidth: 0,
                                      ml: 1,
                                      "&:hover": {
                                        borderColor: "#000",
                                        bgcolor: "#fafafa",
                                      },
                                    }}
                                    component="span"
                                  >
                                    Quét CCCD
                                  </Button>
                                </label>
                              </Box>
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                py: 0.3,
                                px: 0.5,
                                textAlign: "center",
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => removeCoResident(index)}
                                sx={{
                                  color: "#999",
                                  "&:hover": { color: "#d32f2f" },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        fontStyle: "italic",
                        fontFamily: '"Times New Roman", serif',
                        fontSize: "1.05rem",
                        mb: 1,
                      }}
                    >
                      Chưa có người ở cùng.
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        appendCoResident({ fullName: "", cccd: "" })
                      }
                      disabled={
                        coResidentFields.length + 1 >=
                        (selectedRoom?.roomTypeId?.personMax || 1)
                      }
                      sx={{
                        fontFamily: '"Times New Roman", serif',
                        fontSize: "0.95rem",
                        textTransform: "none",
                        color: "#333",
                        textDecoration: "underline",
                        "&:hover": {
                          textDecoration: "underline",
                          bgcolor: "transparent",
                          color: "#000",
                        },
                      }}
                    >
                      + Thêm người ở cùng ({coResidentFields.length + 1}/
                      {selectedRoom?.roomTypeId?.personMax || 1})
                    </Button>
                    {coResidentFields.length + 1 >=
                      (selectedRoom?.roomTypeId?.personMax || 1) && (
                      <Typography
                        sx={{
                          fontStyle: "italic",
                          fontFamily: '"Times New Roman", serif',
                          fontSize: "0.9rem",
                          color: "#999",
                        }}
                      >
                        (Đã đạt giới hạn số người cho loại phòng này)
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Agreement */}
                <Typography paragraph>
                  Hai bên cùng thỏa thuận ký kết hợp đồng thuê nhà với các điều
                  khoản sau:
                </Typography>

                <Typography component="div" sx={{ mb: 2 }}>
                  <strong>Điều 1:</strong> Bên A đồng ý cho Bên B thuê phòng số{" "}
                  <strong>{selectedRoom?.name || "..."}</strong>.
                  <br />
                  - Thời hạn thuê:
                  <TextField
                    variant="standard"
                    type="number"
                    sx={{
                      width: 80,
                      mx: 1,
                      verticalAlign: "baseline",
                      "& .MuiInput-root": {
                        pb: 0,
                        position: "relative",
                        top: "-2px",
                      },
                      "& .MuiFormHelperText-root": { mt: 0 },
                    }}
                    inputProps={{
                      style: {
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        padding: "0 0 2px 0",
                      },
                      min: 6,
                    }}
                    {...register("duration", {
                      required: "Bắt buộc",
                      min: { value: 6, message: "Tối thiểu 6 tháng" },
                      valueAsNumber: true,
                    })}
                    error={!!errors.duration}
                    helperText={errors.duration?.message as string}
                  />
                  tháng, bắt đầu từ ngày
                  <Controller
                    name="startDate"
                    control={control}
                    rules={{ required: "Ngày bắt đầu là bắt buộc" }}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => {
                          if (date && !isNaN(date.getTime())) {
                            field.onChange(formatDate(date, "yyyy-MM-dd"));
                          } else {
                            field.onChange("");
                          }
                        }}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            variant: "standard",
                            sx: {
                              width: 170,
                              mx: 1,
                              verticalAlign: "baseline",
                              "& .MuiInput-root": {
                                pb: 0,
                                position: "relative",
                                top: "-2px",
                              },
                              "& .MuiFormHelperText-root": { mt: 0 },
                            },
                            inputProps: {
                              style: {
                                fontSize: "1rem",
                                padding: "0 0 2px 0",
                                textAlign: "center",
                              },
                            },
                            error: !!errors.startDate,
                            helperText: errors.startDate?.message as string,
                          },
                        }}
                      />
                    )}
                  />
                  .
                  <br />
                  - Trả trước tiền phòng:
                  <TextField
                    variant="standard"
                    type="number"
                    sx={{
                      width: 80,
                      mx: 1,
                      verticalAlign: "baseline",
                      "& .MuiInput-root": {
                        pb: 0,
                        position: "relative",
                        top: "-2px",
                      },
                      "& .MuiFormHelperText-root": { mt: 0, width: 250 },
                    }}
                    inputProps={{
                      style: {
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        padding: "0 0 2px 0",
                      },
                      min: 1,
                      max: watch("duration") || 12,
                    }}
                    {...register("prepayMonths", {
                      valueAsNumber: true,
                      validate: (value) => 
                        !value || value <= (watch("duration") || 12) || "Không vượt quá thời hạn thuê"
                    })}
                    error={!!errors.prepayMonths}
                    helperText={errors.prepayMonths?.message as string}
                  />
                  tháng. <br/>
                  <Typography component="span" sx={{ fontStyle: "italic", fontSize: "0.9rem", color: "#666", ml: 2, display: "inline-block", mt: 0.5 }}>
                    *Lưu ý: Thời hạn tính tiền phòng đã trả sẽ bắt đầu từ ngày đầu tiên của tháng tiếp theo (nếu tạo hợp đồng vào ngày lẻ trong tháng).
                  </Typography>
                  <br />
                  - Giá thuê phòng là:
                  <TextField
                    variant="standard"
                    type="text"
                    sx={{
                      width: 120,
                      mx: 1,
                      verticalAlign: "baseline",
                      "& .MuiInput-root": {
                        pb: 0,
                        position: "relative",
                        top: "-2px",
                      },
                      "& .MuiFormHelperText-root": { mt: 0 },
                    }}
                    inputProps={{
                      style: {
                        textAlign: "right",
                        fontWeight: "bold",
                        color: "#d32f2f",
                        fontSize: "1rem",
                        padding: "0 0 2px 0",
                      },
                    }}
                    InputProps={{ readOnly: true }}
                    value={Number(
                      selectedRoom?.roomTypeId?.currentPrice ||
                        selectedRoom?.price ||
                        0,
                    ).toLocaleString()}
                  />
                  VNĐ/tháng. (Giá này cố định theo loại phòng).
                  <br />- Tiền đặt cọc:{" "}
                  {selectedRoom?.status === "Deposited" ? (
                    <>
                      <TextField
                        variant="standard"
                        type="text"
                        sx={{
                          width: 120,
                          mx: 1,
                          verticalAlign: "baseline",
                          "& .MuiInput-root": {
                            pb: 0,
                            position: "relative",
                            top: "-2px",
                          },
                          "& .MuiFormHelperText-root": { mt: 0 },
                        }}
                        inputProps={{
                          style: {
                            textAlign: "right",
                            fontWeight: "bold",
                            fontSize: "1rem",
                            padding: "0 0 2px 0",
                          },
                        }}
                        InputProps={{ readOnly: true }}
                        value={Number(
                          selectedRoom?.roomTypeId?.currentPrice ||
                            selectedRoom?.price ||
                            0,
                        ).toLocaleString()}
                      />
                      VNĐ (Tương đương 01 tháng tiền phòng).
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
                    </>
                  ) : selectedRoom?.status === "Available" ? (
                    <>
                      <span
                        style={{
                          fontStyle: "italic",
                          color: "#d32f2f",
                          marginLeft: 4,
                        }}
                      >
                        Chưa đặt cọc
                      </span>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // Save current form data to sessionStorage before leaving
                          const draft = {
                            formValues: getValues(),
                            selectedServices,
                            vehicleQuantities,
                            contractImages,
                          };
                          sessionStorage.setItem(
                            "contractFormDraft",
                            JSON.stringify(draft),
                          );
                          const basePath = location.pathname.startsWith(
                            "/owner",
                          )
                            ? "/owner"
                            : "/manager";
                          navigate(
                            `${basePath}/deposits/create/${selectedRoom._id}`,
                            {
                              state: {
                                returnTo: "create-contract",
                                roomId: selectedRoom._id,
                              },
                            },
                          );
                        }}
                        sx={{
                          ml: 1,
                          fontFamily: '"Times New Roman", serif',
                          fontSize: "0.9rem",
                          textTransform: "none",
                          color: "#d32f2f",
                          borderColor: "#d32f2f",
                          py: 0.2,
                          px: 1.5,
                          "&:hover": {
                            borderColor: "#b71c1c",
                            bgcolor: "#fff5f5",
                          },
                        }}
                      >
                        Tạo cọc ngay
                      </Button>
                    </>
                  ) : (
                    <span style={{ fontStyle: "italic", marginLeft: 4 }}>
                      Chọn phòng để hiển thị
                    </span>
                  )}
                </Typography>

                <Typography
                  component="div"
                  sx={{
                    mb: 1,
                    fontFamily: '"Times New Roman", serif',
                    fontSize: "1.1rem",
                  }}
                >
                  <strong>Điều 2:</strong> Các trang thiết bị, tài sản bàn giao
                  kèm theo phòng:
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {roomDevices.length > 0 ? (
                    <Box
                      component="table"
                      sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: '"Times New Roman", serif',
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
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {roomDevices.map((device: any, index: number) => (
                          <Box component="tr" key={index}>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.5,
                                px: 1.5,
                                textAlign: "center",
                                fontFamily: '"Times New Roman", serif',
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
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              {device.name}
                              {device.brand ? ` (${device.brand})` : ""}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.5,
                                px: 1.5,
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              {device.quantity}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.5,
                                px: 1.5,
                                textAlign: "center",
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              {device.unit || "cái"}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                border: "1px solid #333",
                                py: 0.5,
                                px: 1.5,
                                textAlign: "center",
                                fontFamily: '"Times New Roman", serif',
                              }}
                            >
                              {device.condition}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        fontStyle: "italic",
                        fontFamily: '"Times New Roman", serif',
                        fontSize: "1.05rem",
                      }}
                    >
                      Chưa có thiết bị nào được ghi nhận.
                    </Typography>
                  )}
                </Box>

                <Typography
                  paragraph
                  sx={{
                    mt: 2,
                    fontFamily: '"Times New Roman", serif',
                    fontSize: "1.1rem",
                  }}
                >
                  <strong>Điều 3:</strong> Các dịch vụ hàng tháng đi kèm:
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {availableServices.length > 0 ? (
                    <>
                      {/* a) Dịch vụ cố định hàng tháng */}
                      {(() => {
                        const fixedServices = availableServices
                          .filter(
                            (s) =>
                              getServiceCategory(s.name) === "fixed_monthly" &&
                              !isServiceExcludedForRoom(s.name),
                          )
                          .sort(
                            (a, b) =>
                              getFixedServiceSortOrder(a.name) -
                              getFixedServiceSortOrder(b.name),
                          );
                        if (fixedServices.length === 0) return null;
                        return (
                          <Box sx={{ mb: 2.5 }}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                fontFamily: '"Times New Roman", serif',
                                fontSize: "1.1rem",
                                mb: 0.5,
                                textDecoration: "underline",
                              }}
                            >
                              a) Dịch vụ cố định hàng tháng:
                            </Typography>
                            {fixedServices.map((service, idx) => {
                              const personCount = coResidentFields.length + 1;
                              const perPerson = isPerPersonService(
                                service.name,
                              );
                              return (
                                <Typography
                                  key={service._id}
                                  sx={{
                                    fontFamily: '"Times New Roman", serif',
                                    fontSize: "1.1rem",
                                    pl: 2,
                                    mb: 0.3,
                                    lineHeight: 1.8,
                                  }}
                                >
                                  {idx + 1}. {service.name}:{" "}
                                  <strong>
                                    {service.currentPrice.toLocaleString()}
                                  </strong>{" "}
                                  {getServiceUnit(service.name)}
                                  {perPerson && (
                                    <>
                                      {" "}
                                      × {personCount} người ={" "}
                                      <strong>
                                        {(
                                          service.currentPrice * personCount
                                        ).toLocaleString()}
                                      </strong>{" "}
                                      VNĐ/tháng
                                    </>
                                  )}{" "}
                                  <span style={{ fontStyle: "italic" }}>
                                    (Bắt buộc)
                                  </span>
                                </Typography>
                              );
                            })}
                          </Box>
                        );
                      })()}

                      {/* b) Dịch vụ tùy chọn */}
                      {(() => {
                        const optionalServices = availableServices.filter(
                          (s) =>
                            getServiceCategory(s.name) === "quantity_based",
                        );
                        if (optionalServices.length === 0) return null;
                        return (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                fontFamily: '"Times New Roman", serif',
                                fontSize: "1.1rem",
                                mb: 0.5,
                                textDecoration: "underline",
                              }}
                            >
                              b) Dịch vụ tùy chọn (nhập số lượng sử dụng):
                            </Typography>
                            {optionalServices.map((service) => {
                              const selected = selectedServices.find(
                                (s) => s.serviceId === service._id,
                              );
                              const qty = vehicleQuantities[service._id] || 1;
                              return (
                                <Box
                                  key={service._id}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    pl: 2,
                                    mb: 0.3,
                                  }}
                                >
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={!!selected}
                                        onChange={() =>
                                          handleServiceToggle(service)
                                        }
                                        size="small"
                                        sx={{
                                          p: 0.3,
                                          color: "#555",
                                          "&.Mui-checked": {
                                            color: "#333",
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Typography
                                        sx={{
                                          fontFamily:
                                            '"Times New Roman", serif',
                                          fontSize: "1.1rem",
                                        }}
                                      >
                                        {service.name} –{" "}
                                        <strong>
                                          {service.currentPrice.toLocaleString()}
                                        </strong>{" "}
                                        VNĐ/tháng
                                      </Typography>
                                    }
                                    sx={{ mr: 1 }}
                                  />
                                  {selected &&
                                    needsQuantityInput(service.name) && (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontFamily:
                                              '"Times New Roman", serif',
                                            fontSize: "1rem",
                                          }}
                                        >
                                          Số lượng:
                                        </Typography>
                                        <TextField
                                          variant="standard"
                                          type="number"
                                          value={qty}
                                          onChange={(e) =>
                                            handleVehicleQuantityChange(
                                              service._id,
                                              parseInt(e.target.value) || 1,
                                            )
                                          }
                                          inputProps={{
                                            min: 1,
                                            max: 10,
                                            style: {
                                              textAlign: "center",
                                              width: "40px",
                                              fontWeight: "bold",
                                              fontFamily:
                                                '"Times New Roman", serif',
                                            },
                                          }}
                                        />
                                        <Typography
                                          sx={{
                                            fontFamily:
                                              '"Times New Roman", serif',
                                            fontSize: "1rem",
                                          }}
                                        >
                                          ={" "}
                                          <strong>
                                            {(
                                              service.currentPrice * qty
                                            ).toLocaleString()}
                                          </strong>{" "}
                                          VNĐ/tháng
                                        </Typography>
                                      </Box>
                                    )}
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      })()}
                    </>
                  ) : (
                    <Typography
                      sx={{
                        pl: 2,
                        fontStyle: "italic",
                        fontFamily: '"Times New Roman", serif',
                      }}
                    >
                      Chưa có dịch vụ hàng tháng nào được cấu hình.
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Contract Image Upload */}
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
                    fontFamily: '"Times New Roman", serif',
                    fontSize: "1.1rem",
                    mb: 1,
                  }}
                >
                  Ảnh hợp đồng bản cứng (đã ký){" "}
                  <span style={{ color: "red" }}>*</span>
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Times New Roman", serif',
                    fontSize: "1rem",
                    fontStyle: "italic",
                    mb: 1.5,
                    color: "#555",
                  }}
                >
                  Tải lên ảnh chụp hợp đồng đã ký (tối đa 5 ảnh). Hỗ trợ định
                  dạng: JPG, PNG, JPEG, WebP.
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpg,image/jpeg,image/png,image/webp"
                    multiple
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || contractImages.length >= 5}
                    sx={{
                      fontFamily: '"Times New Roman", serif',
                      fontSize: "0.95rem",
                      textTransform: "none",
                      color: "#333",
                      borderColor: "#333",
                      borderStyle: "dashed",
                      px: 3,
                      py: 1,
                      "&:hover": {
                        borderColor: "#000",
                        bgcolor: "#fafafa",
                      },
                    }}
                  >
                    {uploading ? (
                      <>
                        <CircularProgress
                          size={16}
                          sx={{ mr: 1, color: "#333" }}
                        />
                        Đang tải lên...
                      </>
                    ) : (
                      `Chọn ảnh tải lên (${contractImages.length}/5)`
                    )}
                  </Button>
                </Box>

                {imageError && contractImages.length === 0 && (
                  <Typography
                    sx={{
                      color: "#d32f2f",
                      fontFamily: '"Times New Roman", serif',
                      fontSize: "0.95rem",
                      mb: 1.5,
                    }}
                  >
                    Vui lòng tải lên ít nhất 1 ảnh hợp đồng bản cứng (đã ký) để
                    tạo hợp đồng.
                  </Typography>
                )}

                {/* Image Preview Grid */}
                {contractImages.length > 0 && (
                  <Grid container spacing={2}>
                    {contractImages.map((url, index) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                        <Box
                          sx={{
                            position: "relative",
                            border: "1px solid #333",
                            overflow: "hidden",
                            "&:hover .delete-btn": { opacity: 1 },
                          }}
                        >
                          <img
                            src={url}
                            alt={`Hợp đồng ${index + 1}`}
                            style={{
                              width: "100%",
                              height: 180,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <IconButton
                            className="delete-btn"
                            size="small"
                            onClick={() => handleRemoveImage(index)}
                            sx={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              bgcolor: "rgba(255,255,255,0.9)",
                              opacity: 0,
                              transition: "opacity 0.2s",
                              "&:hover": {
                                bgcolor: "#ffebee",
                                color: "#d32f2f",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            sx={{
                              display: "block",
                              textAlign: "center",
                              py: 0.5,
                              fontFamily: '"Times New Roman", serif',
                              fontSize: "0.9rem",
                              borderTop: "1px solid #333",
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

          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              bgcolor: "white",
              p: 2,
              borderTop: "1px solid #ccc",
              display: "flex",
              justifyContent: "center",
              gap: 2,
              zIndex: 1000,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate("/manager/contracts")}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={selectedRoom?.status !== "Deposited" || submitting}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ color: "#fff", mr: 1 }} />
                  Đang tạo hợp đồng...
                </>
              ) : (
                "Xác nhận & Tạo Hợp Đồng"
              )}
            </Button>
          </Box>
        </Container>
      </form>

      {/* Deposit Detail Modal */}
      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        depositId={preFilledDepositId}
        roomId={selectedRoom?._id}
        serifFont={'"Times New Roman", Times, serif'}
      />
    </LocalizationProvider>
  );
};

export default CreateContract;
