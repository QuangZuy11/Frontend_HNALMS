import { useEffect, useState } from "react";
import { Container, Typography, Paper, Box, Tabs, Tab } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Floor Maps
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import "./ContractFloorMap.css";

const API_URL = "http://localhost:9999/api";

const ContractList = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [activeFloorTab, setActiveFloorTab] = useState(0);

  useEffect(() => {
    // Fetch rooms and contracts in parallel
    Promise.all([
      axios.get(`${API_URL}/rooms`),
      axios.get(`${API_URL}/contracts`),
    ])
      .then(([roomsRes, contractsRes]) => {
        const rawRooms = roomsRes.data.data || [];
        const mappedRooms = rawRooms.map((room: any) => {
          let priceNum = 0;
          if (room.roomTypeId && typeof room.roomTypeId.currentPrice === "object" && room.roomTypeId.currentPrice.$numberDecimal) {
            priceNum = parseFloat(room.roomTypeId.currentPrice.$numberDecimal);
          } else if (typeof room.roomTypeId?.currentPrice === "number") {
            priceNum = room.roomTypeId.currentPrice;
          } else if (typeof room.price === "number") {
            priceNum = room.price;
          }

          return {
            ...room,
            price: priceNum,
            priceLabel: priceNum > 0
              ? `${(priceNum / 1000000).toFixed(1)}M`
              : "Chưa có giá",
            floorLabel: room.floorId?.name || "N/A",
          };
        });
        setRooms(mappedRooms);

        if (contractsRes.data.success) {
          setContracts(contractsRes.data.data || []);
        }
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // Build a map: roomId -> contractId (only active contracts)
  const roomContractMap: Record<string, string> = {};
  contracts.forEach((c: any) => {
    if (c.status === "active" && c.roomId?._id) {
      roomContractMap[c.roomId._id] = c._id;
    }
  });

  // When a room is clicked:
  // - Has active contract → go to contract detail
  // - Available/Deposited → go to create contract
  const handleRoomSelect = (room: any) => {
    const contractId = roomContractMap[room._id];
    if (contractId) {
      // Room has active contract → view it
      navigate(`${contractId}`);
    } else if (room.status === "Available" || room.status === "Deposited") {
      // Room is available → create new contract
      navigate("create", { state: { roomId: room._id } });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, bgcolor: "#f8f9fa" }}>
        <Typography
          variant="h5"
          gutterBottom
          color="primary"
          sx={{ fontWeight: "bold", mb: 2 }}
        >
          Quản lý Hợp đồng
        </Typography>

        {/* Floor Tabs */}
        <Tabs
          value={activeFloorTab}
          onChange={(_, v) => setActiveFloorTab(v)}
          sx={{ mb: 2 }}
          variant="scrollable"
        >
          <Tab label="Tầng 1" />
          <Tab label="Tầng 2" />
          <Tab label="Tầng 3" />
          <Tab label="Tầng 4" />
          <Tab label="Tầng 5" />
        </Tabs>

        {/* Floor Map Content */}
        <Box
          className="contract-floor-map"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 2,
            overflow: "hidden",
            minHeight: "400px",
          }}
        >
          {activeFloorTab === 0 && (
            <FloorMap
              rooms={rooms.filter(
                (r: any) =>
                  r.floorId?.name === "1" ||
                  r.floorId?.name === "Tầng 1" ||
                  r.name.startsWith("1"),
              )}
              onRoomSelect={handleRoomSelect}
            />
          )}
          {activeFloorTab === 1 && (
            <FloorMapLevel2
              rooms={rooms.filter(
                (r: any) =>
                  r.floorId?.name === "2" ||
                  r.floorId?.name === "Tầng 2" ||
                  r.name.startsWith("2"),
              )}
              onRoomSelect={handleRoomSelect}
            />
          )}
          {activeFloorTab === 2 && (
            <FloorMapLevel3
              rooms={rooms.filter(
                (r: any) =>
                  r.floorId?.name === "3" ||
                  r.floorId?.name === "Tầng 3" ||
                  r.name.startsWith("3"),
              )}
              onRoomSelect={handleRoomSelect}
            />
          )}
          {activeFloorTab === 3 && (
            <FloorMapLevel4
              rooms={rooms.filter(
                (r: any) =>
                  r.floorId?.name === "4" ||
                  r.floorId?.name === "Tầng 4" ||
                  r.name.startsWith("4"),
              )}
              onRoomSelect={handleRoomSelect}
            />
          )}
          {activeFloorTab === 4 && (
            <FloorMapLevel5
              rooms={rooms.filter(
                (r: any) =>
                  r.floorId?.name === "5" ||
                  r.floorId?.name === "Tầng 5" ||
                  r.name.startsWith("5"),
              )}
              onRoomSelect={handleRoomSelect}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ContractList;
