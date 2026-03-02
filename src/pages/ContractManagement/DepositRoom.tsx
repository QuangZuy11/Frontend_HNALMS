import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";

interface Room {
  _id: string;
  name: string;
  type: string;
  price: number;
  maxPersons: number;
}

interface Deposit {
  _id: string;
  name: string;
  phone: string;
  email: string;
  room: Room;
  amount: number;
  status: "Held" | "Refunded" | "Forfeited";
  createdDate: string;
  refundDate: string | null;
  forfeitedDate: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Held":
      return "primary";
    case "Refunded":
      return "success";
    case "Forfeited":
      return "error";
    default:
      return "default";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const DepositRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path (owner or manager)
  const basePath = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/manager";

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterName, setFilterName] = useState("");
  const [filterContact, setFilterContact] = useState(""); // Phone or Email
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Filter deposits based on filter values
  const filteredDeposits = deposits.filter((deposit) => {
    const matchName = deposit.name
      .toLowerCase()
      .includes(filterName.toLowerCase());
    const matchContact =
      filterContact === "" ||
      deposit.phone.toLowerCase().includes(filterContact.toLowerCase()) ||
      deposit.email.toLowerCase().includes(filterContact.toLowerCase());
    const matchRoom =
      filterRoom === "" ||
      deposit.room?.name?.toLowerCase().includes(filterRoom.toLowerCase());
    const matchStatus =
      filterStatus === "all" || deposit.status === filterStatus;

    return matchName && matchContact && matchRoom && matchStatus;
  });

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        const response = await axios.get("http://localhost:9999/api/deposits", {
          withCredentials: true,
        });
        if (response.data.success) {
          setDeposits(response.data.data);
        } else {
          setError("Failed to fetch deposits");
        }
      } catch (err: any) {
        console.error("Error fetching deposits:", err);
        setError(
          err.response?.data?.message || err.message || "An error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: "center", color: "error.main" }}>
        <Typography variant="h6">Error loading deposits</Typography>
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
          Danh sách tiền cọc
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate(`${basePath}/deposits/floor-map`)}
          sx={{
            bgcolor: "#1a237e",
            "&:hover": { bgcolor: "#303f9f" },
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1,
          }}
        >
          Tạo Cọc Mới
        </Button>
      </Box>

      {/* Filter Section */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Tên..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          sx={{
            width: 110,
            "& .MuiInputBase-input": { py: 0.75, fontSize: 13 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94a3b8", fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          placeholder="SĐT/Email"
          value={filterContact}
          onChange={(e) => setFilterContact(e.target.value)}
          sx={{
            width: 110,
            "& .MuiInputBase-input": { py: 0.75, fontSize: 13 },
          }}
        />
        <TextField
          size="small"
          placeholder="Phòng"
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          sx={{
            width: 80,
            "& .MuiInputBase-input": { py: 0.75, fontSize: 13 },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 95 }}>
          <Select
            value={filterStatus}
            displayEmpty
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ fontSize: 13, "& .MuiSelect-select": { py: 0.75 } }}
          >
            <MenuItem value="all" sx={{ fontSize: 13 }}>
              Trạng thái
            </MenuItem>
            <MenuItem value="Held" sx={{ fontSize: 13 }}>
              Đang giữ
            </MenuItem>
            <MenuItem value="Refunded" sx={{ fontSize: 13 }}>
              Đã hoàn
            </MenuItem>
            <MenuItem value="Forfeited" sx={{ fontSize: 13 }}>
              Đã phạt
            </MenuItem>
          </Select>
        </FormControl>
        {(filterName ||
          filterContact ||
          filterRoom ||
          filterStatus !== "all") && (
          <Button
            size="small"
            onClick={() => {
              setFilterName("");
              setFilterContact("");
              setFilterRoom("");
              setFilterStatus("all");
            }}
            sx={{ minWidth: "auto", p: 0.5, color: "#94a3b8" }}
          >
            <ClearIcon sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Box>

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{ borderRadius: 2, overflow: "hidden" }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>STT</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Tên người cọc</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>SĐT / Email</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Phòng</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Số tiền cọc</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Ngày cọc</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDeposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Không có dữ liệu cọc phòng
                </TableCell>
              </TableRow>
            ) : (
              filteredDeposits.map((deposit, index) => (
                <TableRow
                  key={deposit._id}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": { bgcolor: "#f9f9f9" },
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{deposit.name}</TableCell>
                  <TableCell>
                    {deposit.phone}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {deposit.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{deposit.room?.name || "N/A"}</TableCell>
                  <TableCell sx={{ fontWeight: "medium", color: "error.main" }}>
                    {formatCurrency(deposit.amount)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(deposit.createdDate), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        deposit.status === "Held"
                          ? "Đang giữ"
                          : deposit.status === "Refunded"
                            ? "Đã hoàn"
                            : "Đã phạt"
                      }
                      color={getStatusColor(deposit.status) as any}
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DepositRoom;
