import React, { useEffect, useState } from "react";
import {
    Container,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from "@mui/material";
import { Link } from "react-router-dom";
import axios from "axios";

// Mock API URL
const API_URL = "http://localhost:9999/api";

const ContractList = () => {
    const [contracts, setContracts] = useState<any[]>([]);

    useEffect(() => {
        // Fetch contracts
        axios.get(`${API_URL}/contracts`)
            .then(res => {
                if (res.data.success) {
                    setContracts(res.data.data);
                }
            })
            .catch(err => console.error("Error fetching contracts:", err));
    }, []);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Danh sách Hợp đồng</Typography>
                <Button variant="contained" component={Link} to="/manager/contracts/create">
                    Tạo Hợp đồng Mới
                </Button>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã HĐ</TableCell>
                            <TableCell>Phòng</TableCell>
                            <TableCell>Khách thuê</TableCell>
                            <TableCell>Ngày bắt đầu</TableCell>
                            <TableCell>Ngày kết thúc</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {contracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">Chưa có hợp đồng nào.</TableCell>
                            </TableRow>
                        ) : (
                            contracts.map((contract) => (
                                <TableRow key={contract._id}>
                                    <TableCell>{contract.contractCode}</TableCell>
                                    <TableCell>{contract.roomId?.name}</TableCell>
                                    <TableCell>{contract.tenantId?.username}</TableCell>
                                    <TableCell>{new Date(contract.startDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(contract.endDate).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Chip label={contract.status} color={contract.status === "active" ? "success" : "default"} />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small">Xem</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default ContractList;
