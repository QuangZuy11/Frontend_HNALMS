import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, TextField } from '@mui/material';
import violateService, { CreateViolationPayload } from '../../services/violateService';
import api from '../../services/api';
import './CreateViolation.css';

interface Contract {
  _id: string;
  contractCode: string;
  roomId: {
    _id: string;
    name: string;
  };
  tenantId: {
    _id: string;
    username: string;
    fullname?: string;
    email: string;
    phoneNumber?: string;
  };
}

export default function CreateViolation() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    contractId: string;
    title: string;
    totalAmount: string;
    dueDate: string;
  }>({
    contractId: '',
    title: '',
    totalAmount: '',
    dueDate: '',
  });

  const [formErrors, setFormErrors] = useState<{
    contractId: string;
    title: string;
    totalAmount: string;
    dueDate: string;
  }>({
    contractId: '',
    title: '',
    totalAmount: '',
    dueDate: '',
  });

  // Fetch active contracts
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/contracts', { params: { status: 'Active' } });
      if (response.data.success && Array.isArray(response.data.data)) {
        setContracts(response.data.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách hợp đồng:', err);
      setError('Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const validateForm = () => {
    const errors = {
      contractId: '',
      title: '',
      totalAmount: '',
      dueDate: '',
    };
    let isValid = true;

    if (!formData.contractId) {
      errors.contractId = 'Vui lòng chọn hợp đồng';
      isValid = false;
    }

    if (!formData.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề vi phạm';
      isValid = false;
    }

    if (!formData.totalAmount || formData.totalAmount.trim() === '') {
      errors.totalAmount = 'Vui lòng nhập số tiền';
      isValid = false;
    } else {
      const amount = parseFloat(formData.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.totalAmount = 'Số tiền phải lớn hơn 0';
        isValid = false;
      }
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Vui lòng chọn hạn thanh toán';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoomSelect = (value: string) => {
    setFormData((prev) => ({ ...prev, contractId: value }));
    if (formErrors.contractId) {
      setFormErrors((prev) => ({ ...prev, contractId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateViolationPayload = {
        contractId: formData.contractId,
        title: formData.title.trim(),
        totalAmount: parseFloat(formData.totalAmount),
        dueDate: formData.dueDate,
      };

      const response = await violateService.createViolation(payload);

      if (response.success) {
        alert('Tạo vi phạm thành công!');
        navigate('/manager/violations');
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo vi phạm:', err);
      const msg = err?.response?.data?.message || 'Không thể tạo vi phạm';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/manager/violations');
  };

  // Get selected contract for display
  const selectedContract = contracts.find(c => c._id === formData.contractId);

  return (
    <div className="create-violation-page">
      <div className="create-violation-card">
        <div className="create-violation-header">
          <h1>Tạo vi phạm mới</h1>
          <p className="subtitle">
            Lập phiếu xử lý vi phạm cho cư dân
          </p>
        </div>

        {error && (
          <div className="create-violation-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-violation-form">
          <div className="form-section">
            <h3>Thông tin vi phạm</h3>

            <div className="form-group">
              <label htmlFor="contractId">
                Số phòng <span className="required">*</span>
              </label>
              <Autocomplete
                id="contractId"
                options={contracts}
                value={selectedContract ?? null}
                getOptionLabel={(option) => option.roomId?.name || 'Phòng'}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                loading={loading}
                onChange={(_, value) => handleRoomSelect(value?._id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="-- Chọn số phòng --"
                    error={Boolean(formErrors.contractId)}
                    helperText={formErrors.contractId}
                  />
                )}
              />
            </div>

            {selectedContract && (
              <div className="selected-contract-info">
                <div className="info-row">
                  <span className="info-label">Cư dân:</span>
                  <span className="info-value">
                    {selectedContract.tenantId?.fullname || selectedContract.tenantId?.username}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phòng:</span>
                  <span className="info-value">{selectedContract.roomId?.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">SĐT:</span>
                  <span className="info-value">{selectedContract.tenantId?.phoneNumber || '-'}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title">
                Tiêu đề vi phạm <span className="required">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className={`form-input ${formErrors.title ? 'input-error' : ''}`}
                placeholder="Nhập tiêu đề vi phạm (ví dụ: Bồi thường đồ đạc hỏng)"
                value={formData.title}
                onChange={handleInputChange}
              />
              {formErrors.title && (
                <span className="error-message">{formErrors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="totalAmount">
                Số tiền (VNĐ) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="totalAmount"
                name="totalAmount"
                className={`form-input ${formErrors.totalAmount ? 'input-error' : ''}`}
                placeholder="Nhập số tiền bồi thường"
                value={formData.totalAmount}
                onChange={handleInputChange}
                min="0"
                step="1000"
              />
              {formErrors.totalAmount && (
                <span className="error-message">{formErrors.totalAmount}</span>
              )}
              {formData.totalAmount && !formErrors.totalAmount && (
                <span className="helper-text">
                  {parseFloat(formData.totalAmount || '0').toLocaleString('vi-VN')} VNĐ
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">
                Hạn thanh toán <span className="required">*</span>
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                className={`form-input ${formErrors.dueDate ? 'input-error' : ''}`}
                value={formData.dueDate}
                onChange={handleInputChange}
              />
              {formErrors.dueDate && (
                <span className="error-message">{formErrors.dueDate}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting || loading}
            >
              {submitting ? 'Đang tạo...' : 'Tạo vi phạm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
