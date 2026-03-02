# Deposit Room API Documentation

## Base URL
```
Development: http://localhost:9999/api
Production:  https://your-domain.com/api
```

---

## Endpoints

### 1. Khởi tạo đặt cọc phòng

Tạo giao dịch đặt cọc và nhận QR code thanh toán.

```
POST /deposits/initiate
```

#### Request Headers
| Header | Value |
|--------|-------|
| Content-Type | application/json |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| roomId | string | ✅ | ObjectId của phòng cần đặt cọc |
| name | string | ✅ | Họ tên người đặt cọc |
| phone | string | ✅ | Số điện thoại |
| email | string | ✅ | Email (nhận thông báo xác nhận) |

#### Request Example
```json
{
  "roomId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "nguyenvana@gmail.com"
}
```

#### Response Success (201)
```json
{
  "success": true,
  "message": "Khởi tạo đặt cọc thành công. Vui lòng quét QR để thanh toán.",
  "data": {
    "depositId": "65f2b3c4d5e6f7a8b9c0d1e2",
    "transactionCode": "Coc P310 02032026",
    "depositAmount": 5000000,
    "roomName": "Phòng 310",
    "qrUrl": "https://img.vietqr.io/image/970418-96247HNALMS-qr_only.jpg?amount=5000000&addInfo=Coc%20P310%2002032026&accountName=Hoang%20Nam%20Apartment",
    "bankInfo": {
      "bankBin": "970418",
      "bankAccount": "96247HNALMS",
      "bankAccountName": "Hoang Nam Apartment",
      "content": "Coc P310 02032026"
    },
    "expireAt": "2026-03-02T10:05:00.000Z",
    "expireInSeconds": 300,
    "expireNote": "Giao dịch cần được xác nhận trong 5 phút"
  }
}
```

#### Response Errors
| Status | Message |
|--------|---------|
| 400 | Vui lòng điền đầy đủ thông tin: roomId, name, phone, email |
| 400 | Phòng hiện không thể đặt cọc (trạng thái: Occupied) |
| 404 | Không tìm thấy phòng |
| 500 | Internal Server Error |

---

### 2. Kiểm tra trạng thái thanh toán

Frontend polling endpoint để kiểm tra trạng thái giao dịch.

```
GET /deposits/status/:transactionCode
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| transactionCode | string | Mã giao dịch (VD: HNLMS1709123456789) |

#### Request Example
```
GET /deposits/status/HNLMS1709123456789
```

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "status": "Pending",
    "depositId": "65f2b3c4d5e6f7a8b9c0d1e2",
    "transactionCode": "Coc P310 02032026",
    "amount": 5000000,
    "room": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Phòng 310",
      "status": "Available"
    },
    "expireAt": "2026-03-02T10:05:00.000Z",
    "expireInSeconds": 180
  }
}
```

#### Status Values
| Deposit Status | Room Status | Description |
|----------------|-------------|-------------|
| `Pending` | `Available` | Chờ thanh toán (còn hạn 5 phút) |
| `Held` | `Deposited` | Đã thanh toán, phòng được giữ 7 ngày |
| `Expired` | `Available` | Quá 7 ngày giữ cọc không ký hợp đồng |
| `Refunded` | `Available` | Đã hoàn tiền cọc |
| `Forfeited` | `Available` | Mất cọc (vi phạm hợp đồng) |

> **Lưu ý:** Khi hết 5 phút chưa thanh toán, deposit sẽ bị **XÓA** khỏi database, chỉ lưu lại Payment với status `Failed`.

#### Response Errors
| Status | Message |
|--------|---------|
| 404 | Không tìm thấy giao dịch |
| 500 | Internal Server Error |

---

### 3. Webhook Sepay (Internal)

> ⚠️ **Endpoint này chỉ dành cho Sepay gọi tự động, Frontend KHÔNG gọi.**

```
POST /deposits/webhook/sepay
```

#### Headers từ Sepay
| Header | Value |
|--------|-------|
| Authorization | Apikey {SEPAY_WEBHOOK_TOKEN} |
| Content-Type | application/json |

#### Body từ Sepay
```json
{
  "id": 123456,
  "transferAmount": 5000000,
  "content": "HNLMS1709123456789 dat coc phong",
  "transferType": "in"
}
```

---

## Frontend Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: User chọn phòng → Click "Đặt cọc ngay"                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Hiển thị form nhập thông tin                           │
│  - Họ tên                                                       │
│  - Số điện thoại                                                │
│  - Email                                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Submit form → POST /api/deposits/initiate              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Hiển thị màn hình thanh toán                           │
│  - QR Code (từ qrUrl)                                           │
│  - Thông tin ngân hàng                                          │
│  - Nội dung chuyển khoản (transactionCode)                      │
│  - Số tiền cần chuyển                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Polling mỗi 3-5 giây                                   │
│  GET /api/deposits/status/:transactionCode                      │
│  → Kiểm tra status === "Held"                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Khi status = "Held"                                    │
│  → Hiển thị "Đặt cọc thành công!"                               │
│  → Redirect hoặc hiển thị thông tin xác nhận                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### React/Next.js

```jsx
import { useState, useEffect } from 'react';

const DepositPage = ({ roomId }) => {
  const [step, setStep] = useState('form'); // form | payment | success
  const [depositData, setDepositData] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  // Step 1: Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const res = await fetch('/api/deposits/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, ...formData })
    });
    
    const data = await res.json();
    if (data.success) {
      setDepositData(data.data);
      setStep('payment');
    }
  };

  // Step 2: Polling status
  useEffect(() => {
    if (step !== 'payment' || !depositData) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/deposits/status/${depositData.transactionCode}`);
      const data = await res.json();
      
      if (data.data.status === 'Held') {
        clearInterval(interval);
        setStep('success');
      }
    }, 3000);

    // Timeout after 15 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      alert('Hết thời gian thanh toán');
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step, depositData]);

  // Render form
  if (step === 'form') {
    return (
      <form onSubmit={handleSubmit}>
        <input 
          placeholder="Họ tên" 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required 
        />
        <input 
          placeholder="Số điện thoại" 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
          required 
        />
        <input 
          placeholder="Email" 
          type="email"
          value={formData.email}
          onChange={e => setFormData({...formData, email: e.target.value})}
          required 
        />
        <button type="submit">Tiếp tục thanh toán</button>
      </form>
    );
  }

  // Render payment QR
  if (step === 'payment') {
    return (
      <div>
        <h2>Quét mã QR để thanh toán</h2>
        <img src={depositData.qrUrl} alt="QR Code" />
        
        <div>
          <p><strong>Ngân hàng:</strong> BIDV</p>
          <p><strong>Số tài khoản:</strong> {depositData.bankInfo.bankAccount}</p>
          <p><strong>Chủ tài khoản:</strong> {depositData.bankInfo.bankAccountName}</p>
          <p><strong>Số tiền:</strong> {depositData.depositAmount.toLocaleString('vi-VN')} đ</p>
          <p><strong>Nội dung CK:</strong> {depositData.transactionCode}</p>
        </div>
        
        <p>Đang chờ xác nhận thanh toán...</p>
      </div>
    );
  }

  // Render success
  if (step === 'success') {
    return (
      <div>
        <h2>✅ Đặt cọc thành công!</h2>
        <p>Phòng {depositData.roomName} đã được giữ cho bạn trong 7 ngày.</p>
        <p>Vui lòng liên hệ ban quản lý để ký hợp đồng.</p>
      </div>
    );
  }
};

export default DepositPage;
```

---

## Data Models

### Deposit Model
```javascript
{
  _id: ObjectId,
  name: String,           // Họ tên người đặt cọc
  phone: String,          // Số điện thoại
  email: String,          // Email
  room: ObjectId,         // Ref → Room
  amount: Number,         // Số tiền cọc
  transactionCode: String,// Mã giao dịch unique
  status: Enum,           // "Pending" | "Held" | "Refunded" | "Forfeited"
  refundDate: Date,       // Ngày hoàn tiền (nếu có)
  forfeitedDate: Date,    // Ngày tịch thu cọc (nếu có)
  createdDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Payment Model
```javascript
{
  _id: ObjectId,
  invoiceId: ObjectId,    // Ref → Invoice (null nếu là deposit)
  depositId: ObjectId,    // Ref → Deposit (null nếu là invoice)
  amount: Number,
  transactionCode: String,
  status: Enum,           // "Pending" | "Success" | "Failed"
  paymentDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Environment Variables

```env
# Sepay Configuration
SEPAY_WEBHOOK_TOKEN=your_api_key_here
BANK_BIN=970418
BANK_ACCOUNT=96247HNALMS
BANK_ACCOUNT_NAME=Hoang Nam Apartment
```

### Bank BIN Codes
| Bank | BIN |
|------|-----|
| BIDV | 970418 |
| MBBank | 970422 |
| Vietcombank | 970436 |
| Techcombank | 970407 |
| TPBank | 970423 |
| ACB | 970416 |
