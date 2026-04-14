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
  Chip,
} from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import toastr from "toastr";
import "toastr/build/toastr.min.css";

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
}

type ServiceCategory = "fixed_monthly" | "quantity_based";

interface EditFormValues {
  duration: number;
  coResidents: CoResident[];
}

const EditContract = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Services
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // Images
  const [contractImages, setContractImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditFormValues>({
    mode: "onChange",
    defaultValues: {
      duration: 12,
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

  // Helpers
  const getServiceCategory = (name: string): ServiceCategory => {
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

  const needsQuantityInput = (name: string): boolean => {
    const n = name.toLowerCase();
    if (n.includes("máy giặt")) return false;
    return true;
  };

  const getRoomFloorNumber = (): number => {
    const floorName = contract?.roomId?.floorId?.name || "";
    const match = floorName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const isServiceExcludedForRoom = (name: string): boolean => {
    const n = name.toLowerCase();
    if (
      (n.includes("thang máy") || n.includes("elevator")) &&
      getRoomFloorNumber() === 1
    )
      return true;
    return false;
  };

  // Fetch contract and services
  useEffect(() => {
    toastr.options = {
      positionClass: "toast-top-right",
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
    };

    const fetchData = async () => {
      try {
        const [contractRes, servicesRes] = await Promise.all([
          axios.get(`${API_URL}/contracts/${id}`),
          axios.get(`${API_URL}/services?isActive=true`),
        ]);

        if (contractRes.data.success) {
          const c = contractRes.data.data;
          setContract(c);
          setValue("duration", c.duration);
          setValue("coResidents", c.coResidents || []);
          setContractImages(c.images || []);

          // Set available services
          const services = servicesRes.data.data || [];
          setAvailableServices(services);

          // Initialize selected optional services from existing bookServices
          const optionalState: Record<
            string,
            { selected: boolean; quantity: number }
          > = {};

          // Get existing optional service IDs
          const existingBookServices = c.bookServices || [];

          services.forEach((svc: ServiceItem) => {
            if (getServiceCategory(svc.name) === "quantity_based") {
              const existing = existingBookServices.find(
                (bs: any) =>
                  bs.serviceId === svc._id || bs.serviceId?._id === svc._id,
              );
              optionalState[svc._id] = {
                selected: !!existing,
                quantity: existing?.quantity || 1,
              };
            }
          });
          setSelectedOptionalIds(optionalState);
        }
      } catch (err) {
        console.error("Error fetching contract:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Image handling
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - contractImages.length;
    if (files.length > remaining) {
      toastr.warning(`Chỉ có thể tải thêm tối đa ${remaining} ảnh.`);
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
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (res.data.success) {
        setContractImages((prev) => [...prev, ...res.data.data]);
      }
    } catch (err: any) {
      toastr.error("Lỗi tải ảnh: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setContractImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle optional service
  const toggleOptionalService = (serviceId: string) => {
    setSelectedOptionalIds((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        selected: !prev[serviceId]?.selected,
        quantity: prev[serviceId]?.quantity || 1,
      },
    }));
  };

  const updateOptionalQuantity = (serviceId: string, qty: number) => {
    setSelectedOptionalIds((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        quantity: Math.max(1, qty),
      },
    }));
  };

  // Submit
  const onSubmit = async (data: EditFormValues) => {
    if (contractImages.length === 0) {
      toastr.warning("Phải có ít nhất 1 ảnh hợp đồng bản cứng.");
      return;
    }

    setSaving(true);
    try {
      // Build optional services payload
      const optionalServices = Object.entries(selectedOptionalIds)
        .filter(([, val]) => val.selected)
        .map(([serviceId, val]) => ({
          serviceId,
          quantity: val.quantity,
          startDate: contract.startDate,
          endDate: null,
        }));

      const payload = {
        duration: Number(data.duration),
        coResidents: data.coResidents,
        optionalServices,
        images: contractImages,
      };

      const res = await axios.put(`${API_URL}/contracts/${id}`, payload);
      if (res.data.success) {
        toastr.success("Cập nhật hợp đồng thành công!");
        navigate(-1);
      }
    } catch (err: any) {
      toastr.error("Lỗi cập nhật: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const serifFont = '"Times New Roman", Times, serif';
  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

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

  const roomPrice = parseFloat(
    contract.roomId?.roomTypeId?.currentPrice?.toString() || "0",
  );
  const personMax = contract.roomId?.roomTypeId?.personMax || 1;

  // Categorize available services
  const fixedServices = availableServices.filter(
    (s) =>
      getServiceCategory(s.name) === "fixed_monthly" &&
      !isServiceExcludedForRoom(s.name),
  );
  const optionalAvailable = availableServices.filter(
    (s) => getServiceCategory(s.name) === "quantity_based",
  );

  // Sort fixed
  const getFixedSortOrder = (name: string): number => {
    const n = name.toLowerCase();
    if (n.includes("điện")) return 1;
    if (n.includes("nước")) return 2;
    if (n.includes("internet") || n.includes("wifi")) return 3;
    if (n.includes("vệ sinh")) return 4;
    return 99;
  };
  const sortedFixed = [...fixedServices].sort(
    (a, b) => getFixedSortOrder(a.name) - getFixedSortOrder(b.name),
  );

  const getServiceUnit = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("điện")) return "VNĐ/kWh";
    if (n.includes("nước")) return "VNĐ/m³";
    return "VNĐ/tháng";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
          <Chip
            label="Đang chỉnh sửa"
            color="warning"
            sx={{ fontWeight: "bold", fontSize: "0.95rem", px: 1 }}
          />
        </Box>

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
              CHỈNH SỬA HỢP ĐỒNG THUÊ NHÀ
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontStyle: "italic", mt: 1, fontFamily: serifFont }}
            >
              (Mã HĐ: {contract.contractCode})
            </Typography>
          </Box>

          <Box
            sx={{ lineHeight: 2, fontSize: "1.1rem", fontFamily: serifFont }}
          >
            {/* Read-only tenant info */}
            <Typography
              sx={{
                fontWeight: "bold",
                textDecoration: "underline",
                fontFamily: serifFont,
                mb: 1,
              }}
            >
              BÊN B (Bên thuê) — Không thể sửa:
            </Typography>
            <Box sx={{ pl: 2, mb: 2, opacity: 0.8 }}>
              <Typography sx={{ fontFamily: serifFont }}>
                Họ và tên:{" "}
                <strong>
                  {contract.tenantInfo?.fullname ||
                    contract.tenantId?.username ||
                    "—"}
                </strong>{" "}
                | CCCD: <strong>{contract.tenantInfo?.cccd || "—"}</strong> |
                SĐT: <strong>{contract.tenantId?.phoneNumber || "—"}</strong>
              </Typography>
            </Box>

            {/* Điều 1 - Editable duration */}
            <Typography
              component="div"
              sx={{ mb: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
            >
              <strong>Điều 1:</strong> Phòng số{" "}
              <strong>{contract.roomId?.name || "—"}</strong>. Giá thuê:{" "}
              <strong style={{ color: "#d32f2f" }}>
                {roomPrice.toLocaleString()}
              </strong>{" "}
              VNĐ/tháng.
              <br />- Thời hạn thuê:{" "}
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
              />{" "}
              tháng, bắt đầu từ{" "}
              <strong>{formatDateVN(contract.startDate)}</strong>.
            </Typography>

            {/* Danh sách người ở cùng - Editable */}
            <Typography
              paragraph
              sx={{ mt: 2, fontFamily: serifFont, fontSize: "1.1rem" }}
            >
              <strong>Danh sách người ở cùng trong phòng</strong> (tối đa{" "}
              {personMax} người/phòng):
            </Typography>
            <Box sx={{ pl: 3 }}>
              {coResidentFields.length > 0 ? (
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
                      {["STT", "Họ và tên", "Số CCCD/CMND", ""].map((h) => (
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
                    {coResidentFields.map((field, idx) => (
                      <Box component="tr" key={field.id}>
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
                          <TextField
                            variant="standard"
                            fullWidth
                            placeholder="Họ và tên..."
                            {...register(`coResidents.${idx}.fullName`, {
                              required: "Bắt buộc",
                            })}
                            error={!!errors.coResidents?.[idx]?.fullName}
                            InputProps={{
                              style: {
                                fontFamily: serifFont,
                                fontSize: "1.05rem",
                              },
                            }}
                          />
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
                          <TextField
                            variant="standard"
                            fullWidth
                            placeholder="Số CCCD..."
                            {...register(`coResidents.${idx}.cccd`, {
                              required: "Bắt buộc",
                              pattern: {
                                value: /^[0-9]{12}$/,
                                message: "CCCD phải 12 số",
                              },
                            })}
                            error={!!errors.coResidents?.[idx]?.cccd}
                            InputProps={{
                              style: {
                                fontFamily: serifFont,
                                fontSize: "1.05rem",
                                textAlign: "center",
                              },
                            }}
                          />
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            border: "1px solid #333",
                            textAlign: "center",
                            width: "40px",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => removeCoResident(idx)}
                            sx={{ color: "#d32f2f" }}
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
                    fontFamily: serifFont,
                    fontSize: "1.05rem",
                    mb: 1,
                  }}
                >
                  Không có người ở cùng.
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  if (coResidentFields.length + 1 >= personMax) {
                    toastr.warning(
                      `Tối đa ${personMax} người/phòng (gồm cả người thuê chính).`,
                    );
                    return;
                  }
                  appendCoResident({ fullName: "", cccd: "" });
                }}
                disabled={coResidentFields.length + 1 >= personMax}
                sx={{
                  fontFamily: serifFont,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  mt: 0.5,
                }}
              >
                + Thêm người ở cùng
              </Button>
            </Box>

            {/* Điều 3 - Services */}
            <Typography
              paragraph
              sx={{ mt: 3, fontFamily: serifFont, fontSize: "1.1rem" }}
            >
              <strong>Điều 3:</strong> Các dịch vụ hàng tháng đi kèm:
            </Typography>
            <Box sx={{ pl: 3 }}>
              {/* a) Fixed - read only */}
              {sortedFixed.length > 0 && (
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
                    a) Dịch vụ cố định hàng tháng (không thể sửa):
                  </Typography>
                  {sortedFixed.map((service, idx) => (
                    <Typography
                      key={service._id}
                      sx={{
                        fontFamily: serifFont,
                        fontSize: "1.1rem",
                        pl: 2,
                        mb: 0.3,
                        lineHeight: 1.8,
                        opacity: 0.8,
                      }}
                    >
                      {idx + 1}. {service.name}:{" "}
                      <strong>{service.currentPrice.toLocaleString()}</strong>{" "}
                      {getServiceUnit(service.name)}{" "}
                      <span style={{ fontStyle: "italic" }}>(Bắt buộc)</span>
                    </Typography>
                  ))}
                </Box>
              )}

              {/* b) Optional - editable */}
              {optionalAvailable.length > 0 && (
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
                    b) Dịch vụ tùy chọn (có thể sửa):
                  </Typography>
                  {optionalAvailable.map((service) => {
                    const state = selectedOptionalIds[service._id] || {
                      selected: false,
                      quantity: 1,
                    };
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
                              checked={state.selected}
                              onChange={() =>
                                toggleOptionalService(service._id)
                              }
                              size="small"
                              sx={{
                                p: 0.3,
                                color: "#555",
                                "&.Mui-checked": { color: "#333" },
                              }}
                            />
                          }
                          label={
                            <Typography
                              sx={{
                                fontFamily: serifFont,
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
                        {state.selected && needsQuantityInput(service.name) && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: serifFont,
                                fontSize: "1rem",
                              }}
                            >
                              Số lượng:
                            </Typography>
                            <TextField
                              variant="standard"
                              type="number"
                              value={state.quantity}
                              onChange={(e) =>
                                updateOptionalQuantity(
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
                                  fontFamily: serifFont,
                                },
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: serifFont,
                                fontSize: "1rem",
                              }}
                            >
                              ={" "}
                              <strong>
                                {(
                                  service.currentPrice * state.quantity
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
              )}
            </Box>

            {/* Contract Images - Editable */}
            <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #333" }}>
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontFamily: serifFont,
                  fontSize: "1.1rem",
                  mb: 1,
                }}
              >
                Ảnh hợp đồng bản cứng (đã ký){" "}
                <span style={{ color: "red" }}>*</span>
              </Typography>
              <Typography
                sx={{
                  fontFamily: serifFont,
                  fontSize: "1rem",
                  fontStyle: "italic",
                  mb: 1.5,
                  color: "#555",
                }}
              >
                Tải lên ảnh chụp hợp đồng đã ký (tối đa 5 ảnh).
              </Typography>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
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
                    fontFamily: serifFont,
                    fontSize: "0.95rem",
                    textTransform: "none",
                    color: "#333",
                    borderColor: "#333",
                    borderStyle: "dashed",
                    px: 3,
                    py: 1,
                    "&:hover": { borderColor: "#000", bgcolor: "#fafafa" },
                  }}
                >
                  {uploading
                    ? "Đang tải..."
                    : `Tải ảnh lên (${contractImages.length}/5)`}
                </Button>
              </Box>

              {contractImages.length > 0 && (
                <Grid container spacing={2}>
                  {contractImages.map((url, index) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                      <Box
                        sx={{
                          position: "relative",
                          border: "1px solid #333",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={url}
                          alt={`Ảnh ${index + 1}`}
                          style={{
                            width: "100%",
                            height: 150,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage(index)}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            bgcolor: "rgba(255,255,255,0.85)",
                            color: "#d32f2f",
                            "&:hover": { bgcolor: "#fff" },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Bottom action bar */}
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
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </Box>
      </Container>
    </form>
  );
};

export default EditContract;
