import { useState, useEffect } from "react";
import {
  Clock,
  Home,
  Shield,
  Users,
  Zap,
  AlertCircle,
  Truck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  getActiveBuildingRules,
  createBuildingRules,
  updateBuildingRules,
  deleteBuildingRules,
} from "../../services/buildingService";
import "./BuildingRulesPublic.css";
import { useToast } from "../../components/common/Toast";

// Mapping icon từ tên string sang component
const iconMap = {
  Clock: Clock,
  Home: Home,
  Shield: Shield,
  Users: Users,
  Zap: Zap,
  AlertCircle: AlertCircle,
  Truck: Truck,
};

const iconOptions = [
  "Clock",
  "Home",
  "Shield",
  "Users",
  "Zap",
  "AlertCircle",
  "Truck",
];

const BuildingRulesPublic = () => {
  // Kiểm tra quyền admin/manager
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdminOrManager = user && user.role === "owner";

  // State quản lý dữ liệu nội quy
  const [rulesData, setRulesData] = useState(null);
  // State quản lý trạng thái loading
  const [loading, setLoading] = useState(true);
  // State quản lý lỗi
  const [error, setError] = useState(null);
  // State quản lý chế độ chỉnh sửa
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'category', 'guideline'
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingGuideline, setEditingGuideline] = useState(null);

  // State popup xác nhận xóa
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "category" | "guideline" | null;
    index: number | null;
    title: string;
  }>({ isOpen: false, type: null, index: null, title: "" });

  useEffect(() => {
    fetchRules();
  }, []);

  /**
   * Gọi API lấy dữ liệu nội quy từ backend
   */
  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await getActiveBuildingRules();
      setRulesData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching rules:", err);
      setError("Không thể tải nội quy tòa nhà. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý lưu nội quy (Admin/Manager only)
  const handleSaveRules = async () => {
    try {
      if (rulesData._id) {
        await updateBuildingRules(rulesData._id, rulesData);
      } else {
        await createBuildingRules(rulesData);
      }
      setIsEditing(false);
      fetchRules();
      showToast("success", "Lưu nội quy thành công!");
    } catch (err) {
      console.error("Error saving rules:", err);
      showToast("error", "Không thể lưu nội quy. Vui lòng thử lại.");
    }
  };

  // Xử lý category
  const handleAddCategory = () => {
    setEditingCategory({ title: "", icon: "Clock", rules: [""] });
    setModalType("category");
    setShowModal(true);
  };

  const handleEditCategory = (index) => {
    setEditingCategory({ ...rulesData.categories[index], index });
    setModalType("category");
    setShowModal(true);
  };

  const handleDeleteCategory = async (index) => {
    const categoryName = rulesData.categories[index]?.title || "danh mục này";
    setDeleteConfirm({
      isOpen: true,
      type: "category",
      index,
      title: `Bạn có chắc muốn xóa danh mục "${categoryName}" không?`,
    });
  };

  const handleDeleteGuideline = async (index) => {
    const guidelineTitle = rulesData.guidelines[index]?.title || "hướng dẫn này";
    setDeleteConfirm({
      isOpen: true,
      type: "guideline",
      index,
      title: `Bạn có chắc muốn xóa hướng dẫn "${guidelineTitle}" không?`,
    });
  };

  const executeDelete = async () => {
    const { type, index } = deleteConfirm;
    if (type === null || index === null) return;

    try {
      if (type === "category") {
        const newCategories = rulesData.categories.filter((_, i) => i !== index);
        const updatedData = { ...rulesData, categories: newCategories };
        if (rulesData._id) {
          await updateBuildingRules(rulesData._id, updatedData);
        }
        setRulesData(updatedData);
        await fetchRules();
        showToast("success", "Xóa danh mục thành công!");
      } else if (type === "guideline") {
        const newGuidelines = rulesData.guidelines.filter((_, i) => i !== index);
        const updatedData = { ...rulesData, guidelines: newGuidelines };
        if (rulesData._id) {
          await updateBuildingRules(rulesData._id, updatedData);
        }
        setRulesData(updatedData);
        await fetchRules();
        showToast("success", "Xóa hướng dẫn thành công!");
      }
    } catch (err) {
      console.error("Error deleting:", err);
      showToast("error", "Không thể xóa. Vui lòng thử lại.");
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, index: null, title: "" });
    }
  };

  const handleSaveCategory = async () => {
    try {
      const newCategories = [...(rulesData.categories || [])];
      if (editingCategory.index !== undefined) {
        newCategories[editingCategory.index] = {
          title: editingCategory.title,
          icon: editingCategory.icon,
          rules: editingCategory.rules.filter((r) => r.trim() !== ""),
        };
      } else {
        newCategories.push({
          title: editingCategory.title,
          icon: editingCategory.icon,
          rules: editingCategory.rules.filter((r) => r.trim() !== ""),
        });
      }
      const updatedData = { ...rulesData, categories: newCategories };

      // Lưu vào database ngay
      if (rulesData._id) {
        await updateBuildingRules(rulesData._id, updatedData);
      } else {
        await createBuildingRules(updatedData);
      }

      setRulesData(updatedData);
      setShowModal(false);
      setEditingCategory(null);
      await fetchRules(); // Reload data từ server

      // Thông báo thành công
      const isNewCategory = editingCategory.index === undefined;
      showToast("success", isNewCategory ? "Thêm danh mục mới thành công!" : "Cập nhật danh mục thành công!");
    } catch (err) {
      console.error("Error saving category:", err);
      showToast("error", "Không thể lưu danh mục. Vui lòng thử lại.");
    }
  };

  // Xử lý guideline
  const handleAddGuideline = () => {
    setEditingGuideline({ title: "", content: "" });
    setModalType("guideline");
    setShowModal(true);
  };

  const handleEditGuideline = (index) => {
    setEditingGuideline({ ...rulesData.guidelines[index], index });
    setModalType("guideline");
    setShowModal(true);
  };

  const handleSaveGuideline = async () => {
    try {
      const newGuidelines = [...(rulesData.guidelines || [])];
      if (editingGuideline.index !== undefined) {
        newGuidelines[editingGuideline.index] = {
          title: editingGuideline.title,
          content: editingGuideline.content,
        };
      } else {
        newGuidelines.push({
          title: editingGuideline.title,
          content: editingGuideline.content,
        });
      }
      const updatedData = { ...rulesData, guidelines: newGuidelines };

      // Lưu vào database ngay
      if (rulesData._id) {
        await updateBuildingRules(rulesData._id, updatedData);
      } else {
        await createBuildingRules(updatedData);
      }

      setRulesData(updatedData);
      setShowModal(false);
      setEditingGuideline(null);
      await fetchRules(); // Reload data từ server

      // Thông báo thành công
      const isNewGuideline = editingGuideline.index === undefined;
      showToast("success", isNewGuideline ? "Thêm hướng dẫn mới thành công!" : "Cập nhật hướng dẫn thành công!");
    } catch (err) {
      console.error("Error saving guideline:", err);
      showToast("error", "Không thể lưu hướng dẫn. Vui lòng thử lại.");
    }
  };

  const addRuleToCategory = () => {
    setEditingCategory({
      ...editingCategory,
      rules: [...editingCategory.rules, ""],
    });
  };

  const updateCategoryRule = (index, value) => {
    const newRules = [...editingCategory.rules];
    newRules[index] = value;
    setEditingCategory({ ...editingCategory, rules: newRules });
  };

  const removeCategoryRule = (index) => {
    const newRules = editingCategory.rules.filter((_, i) => i !== index);
    setEditingCategory({ ...editingCategory, rules: newRules });
  };

  // Đang tải dữ liệu
  if (loading) {
    return (
      <div className="brp-loading-container">
        <div className="brp-loading-content">
          <div className="brp-spinner"></div>
          <p className="brp-loading-text">Đang tải nội quy...</p>
        </div>
      </div>
    );
  }

  // Lỗi
  if (error) {
    return (
      <div className="brp-error-container">
        <div className="brp-error-content">
          <AlertCircle className="brp-error-icon" />
          <h2 className="brp-error-title">Có lỗi xảy ra</h2>
          <p className="brp-error-message">{error}</p>
          <button onClick={fetchRules} className="brp-retry-button">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Không có dữ liệu
  if (!rulesData) {
    return (
      <div className="brp-no-data-container">
        <div className="brp-no-data-content">
          <p className="brp-no-data-text">Không có dữ liệu nội quy</p>
        </div>
      </div>
    );
  }

  return (
    <main className="brp-page">
      <div className="brp-container">
        {/* Header */}
        <div className="brp-header" style={{ position: "relative" }}>
          <h1 className="brp-title">Nội Quy Tòa Nhà</h1>
          <p className="brp-description">
            Để đảm bảo môi trường sống thoải mái và an toàn cho
            <br />
            tất cả cư dân, vui lòng tuân thủ các quy định dưới đây
          </p>

          {/* Nút chỉnh sửa cho Admin/Manager */}
          {isAdminOrManager && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                display: "flex",
                gap: "0.5rem",
              }}
            >
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  <Edit style={{ width: "1rem", height: "1rem" }} />
                  Chỉnh sửa
                </button>
              ) : (
                <>
                  <button onClick={handleSaveRules} className="save-button">
                    <Save style={{ width: "1rem", height: "1rem" }} />
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchRules();
                    }}
                    className="cancel-button"
                  >
                    <X style={{ width: "1rem", height: "1rem" }} />
                    Hủy
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Important Notice */}
        {rulesData.importantNotice && (
          <div className="important-notice">
            <h3 className="notice-title">
              <AlertCircle className="notice-icon" />
              {isEditing ? (
                <input
                  type="text"
                  value={rulesData.importantNotice.title}
                  onChange={(e) =>
                    setRulesData({
                      ...rulesData,
                      importantNotice: {
                        ...rulesData.importantNotice,
                        title: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                  }}
                />
              ) : (
                rulesData.importantNotice.title
              )}
            </h3>
            <p className="notice-content">
              {isEditing ? (
                <textarea
                  value={rulesData.importantNotice.content}
                  onChange={(e) =>
                    setRulesData({
                      ...rulesData,
                      importantNotice: {
                        ...rulesData.importantNotice,
                        content: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    minHeight: "80px",
                  }}
                />
              ) : (
                rulesData.importantNotice.content
              )}
            </p>
          </div>
        )}

        {/* Rules Grid */}
        {rulesData.categories && rulesData.categories.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                Danh Mục Nội Quy
              </h2>
              {isAdminOrManager && isEditing && (
                <button
                  onClick={handleAddCategory}
                  className="edit-button"
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <Plus style={{ width: "1rem", height: "1rem" }} />
                  Thêm
                </button>
              )}
            </div>
            <div className="rules-grid">
              {rulesData.categories.map((category, index) => {
                const IconComponent = iconMap[category.icon] || AlertCircle;
                return (
                  <div key={index} className="rule-card">
                    <div className="rule-card-content">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <h3 className="rule-card-title">
                          <IconComponent className="rule-icon" />
                          {category.title}
                        </h3>
                        {isAdminOrManager && isEditing && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleEditCategory(index)}
                              style={{
                                padding: "0.25rem",
                                color: "#3b82f6",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <Edit style={{ width: "1rem", height: "1rem" }} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(index)}
                              style={{
                                padding: "0.25rem",
                                color: "#ef4444",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2
                                style={{ width: "1rem", height: "1rem" }}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                      <ul className="rule-list">
                        {category.rules.map((rule, ruleIndex) => (
                          <li key={ruleIndex} className="rule-item">
                            <span className="rule-checkmark">✓</span>
                            <span className="rule-text">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Guidelines Section */}
        {rulesData.guidelines && rulesData.guidelines.length > 0 && (
          <div className="guidelines-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 className="guidelines-title">Hướng Dẫn Chung</h3>
              {isAdminOrManager && isEditing && (
                <button
                  onClick={handleAddGuideline}
                  className="edit-button"
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <Plus style={{ width: "1rem", height: "1rem" }} />
                  Thêm
                </button>
              )}
            </div>
            <div className="guidelines-list">
              {rulesData.guidelines.map((guideline, index) => (
                <div key={index} className="guideline-item">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <h4 className="guideline-heading">
                      {index + 1}. {guideline.title}
                    </h4>
                    {isAdminOrManager && isEditing && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleEditGuideline(index)}
                          style={{
                            padding: "0.25rem",
                            color: "#3b82f6",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Edit style={{ width: "1rem", height: "1rem" }} />
                        </button>
                        <button
                          onClick={() => handleDeleteGuideline(index)}
                          style={{
                            padding: "0.25rem",
                            color: "#ef4444",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 style={{ width: "1rem", height: "1rem" }} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="guideline-content">{guideline.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Section */}
        {rulesData.contact &&
          (rulesData.contact.phone || rulesData.contact.zalo) && (
            <div className="rules-contact-section">
              <h2 className="rules-contact-title">Có Câu Hỏi?</h2>
              <p className="contact-description">
                Liên hệ với ban quản lý để được giải đáp các thắc mắc về nội quy
              </p>
              {isEditing ? (
                <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={rulesData.contact.phone}
                    onChange={(e) =>
                      setRulesData({
                        ...rulesData,
                        contact: {
                          ...rulesData.contact,
                          phone: e.target.value,
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Link Zalo"
                    value={rulesData.contact.zalo}
                    onChange={(e) =>
                      setRulesData({
                        ...rulesData,
                        contact: { ...rulesData.contact, zalo: e.target.value },
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                    }}
                  />
                </div>
              ) : (
                <div className="rules-contact-buttons">
                  {rulesData.contact.phone && (
                    <a
                      href={`tel:${rulesData.contact.phone}`}
                      className="rules-contact-link"
                    >
                      <button className="rules-contact-button">
                        📞 Gọi: {rulesData.contact.phone}
                      </button>
                    </a>
                  )}
                  {rulesData.contact.zalo && (
                    <a
                      href={rulesData.contact.zalo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rules-contact-link"
                    >
                      <button className="rules-contact-button">
                        💬 Chat Zalo
                      </button>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Modal thêm/sửa Category */}
      {showModal && modalType === "category" && editingCategory && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory.index !== undefined
                  ? "Chỉnh sửa danh mục"
                  : "Thêm danh mục mới"}
              </h3>
            </div>

            <div className="modal-body">
              <div className="modal-field">
                <label className="modal-label">Tiêu đề</label>
                <input
                  type="text"
                  value={editingCategory.title}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      title: e.target.value,
                    })
                  }
                  className="modal-input"
                  placeholder="Ví dụ: Giờ Yên Tĩnh & Sinh Hoạt"
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Icon</label>

                {/* Preview icon đang được chọn */}
                

                {/* Grid chọn icon */}
                <div className="hnalms-icon-grid">
                  {iconOptions.map((iconName) => {
                    const IconComponent = iconMap[iconName];
                    const isSelected = editingCategory.icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        title={iconName}
                        onClick={() =>
                          setEditingCategory({
                            ...editingCategory,
                            icon: iconName,
                          })
                        }
                        className={`hnalms-icon-option${isSelected ? " hnalms-icon-option--active" : ""}`}
                      >
                        <IconComponent size={20} />
                        <span className="hnalms-icon-name">{iconName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-field">
                <label className="modal-label">Quy định</label>
                {editingCategory.rules.map((rule, index) => (
                  <div key={index} className="rule-input-group">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) =>
                        updateCategoryRule(index, e.target.value)
                      }
                      className="modal-input"
                      placeholder="Nhập quy định"
                    />
                    <button
                      onClick={() => removeCategoryRule(index)}
                      className="delete-rule-button"
                    >
                      <Trash2 style={{ width: "1rem", height: "1rem" }} />
                    </button>
                  </div>
                ))}
                <button onClick={addRuleToCategory} className="add-rule-button">
                  + Thêm quy định
                </button>
              </div>

              <div className="modal-footer">
                <button
                  onClick={handleSaveCategory}
                  className="modal-button-primary"
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  className="modal-button-secondary"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm/sửa Guideline */}
      {showModal && modalType === "guideline" && editingGuideline && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingGuideline.index !== undefined
                  ? "Chỉnh sửa hướng dẫn"
                  : "Thêm hướng dẫn mới"}
              </h3>
            </div>

            <div className="modal-body">
              <div className="modal-field">
                <label className="modal-label">Tiêu đề</label>
                <input
                  type="text"
                  value={editingGuideline.title}
                  onChange={(e) =>
                    setEditingGuideline({
                      ...editingGuideline,
                      title: e.target.value,
                    })
                  }
                  className="modal-input"
                  placeholder="Ví dụ: Thời Hạn Thuê Nhà"
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Nội dung</label>
                <textarea
                  value={editingGuideline.content}
                  onChange={(e) =>
                    setEditingGuideline({
                      ...editingGuideline,
                      content: e.target.value,
                    })
                  }
                  className="modal-textarea"
                  placeholder="Nhập nội dung hướng dẫn"
                />
              </div>

              <div className="modal-footer">
                <button
                  onClick={handleSaveGuideline}
                  className="modal-button-primary"
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingGuideline(null);
                  }}
                  className="modal-button-secondary"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup Xác Nhận Xóa */}
      {deleteConfirm.isOpen && (
        <div className="brp-confirm-overlay">
          <div className="brp-confirm-modal">
            <div className="brp-confirm-icon">
              <AlertCircle size={36} color="#ef4444" />
            </div>
            <h3 className="brp-confirm-title">Xác nhận xóa</h3>
            <p className="brp-confirm-message">{deleteConfirm.title}</p>
            <div className="brp-confirm-actions">
              <button
                className="brp-confirm-cancel"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, index: null, title: "" })}
              >
                <X size={16} /> Hủy bỏ
              </button>
              <button className="brp-confirm-delete" onClick={executeDelete}>
                <Trash2 size={16} /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default BuildingRulesPublic;
