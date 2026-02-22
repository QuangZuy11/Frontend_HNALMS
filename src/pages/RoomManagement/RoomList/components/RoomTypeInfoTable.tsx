

import './RoomTypeInfoTable.css';

const ROOM_INFO_DATA = [
    {
        type: "Loại 1",
        price: "2.900.000đ/tháng",
        desc: "Phòng rộng, ở tối đa 3 người, có 2 cửa sổ hướng thoáng và ban công thoáng mát, đón gió và ánh sáng tự nhiên (áp dụng tầng 2, 3, 4)."
    },
    {
        type: "Loại 2",
        price: "2.700.000đ/tháng",
        desc: "Phù hợp 2 người ở, có 1 cửa sổ hướng thoáng và ban công thoáng, không gian sáng, dễ chịu (tầng 2, 3, 4)."
    },
    {
        type: "Loại 3",
        price: "2.500.000đ/tháng",
        desc: "Ở 2 người, có 2 cửa sổ và ban công nhưng đều hướng tù, phù hợp khách cần phòng yên tĩnh, giá mềm (tầng 2, 3, 4)."
    },
    {
        type: "Loại 4",
        price: "2.000.000đ/tháng",
        desc: "Ở 2 người, có 1 cửa sổ tương đối thoáng, phòng mát mẻ, tiện sinh hoạt (chỉ áp dụng tầng 1)."
    },
    {
        type: "Loại 5",
        price: "1.800.000đ/tháng",
        desc: "Ở 2 người, không cửa sổ, không ban công, phù hợp sinh viên hoặc người đi làm cần phòng giá tiết kiệm (tầng 1)."
    },
    {
        type: "Loại 6",
        price: "2.300.000đ/tháng",
        desc: "Ở 2 người, có 1 cửa sổ hướng thoáng và 1 ban công thoáng, tuy nhiên mái trần bằng tôn nên giá mềm hơn so với phòng cùng diện tích."
    },
    {
        type: "Loại 7",
        price: "2.100.000đ/tháng",
        desc: "Ở 2 người, có 1 cửa sổ hướng tù và 1 ban công hướng tù, mái trần tôn, phù hợp khách ưu tiên chi phí thấp."
    }
];

export default function RoomTypeInfoTable() {
    return (
        <div className="room-type-info-card">
            <div className="room-type-info-header">
                <h3 className="room-type-info-title">Bảng thông tin chi tiết các loại phòng</h3>
            </div>
            <div className="room-type-info-grid">
                {ROOM_INFO_DATA.map((item, index) => (
                    <div key={index} className="rti-card">
                        <div className="rti-card-header">
                            <span className="rti-type-name">{item.type}</span>
                            <span className="rti-price">{item.price}</span>
                        </div>
                        <div className="rti-card-body">
                            <p className="rti-desc">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
