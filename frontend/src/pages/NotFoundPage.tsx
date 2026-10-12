import { Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import './NotFoundPage.css';

function NotFoundPage() {
    useDocumentMeta({
        title: 'Không tìm thấy trang',
        description: 'Trang bạn đang tìm không tồn tại. Hãy quay lại trang chủ hoặc khám phá các gói chụp.',
        noIndex: true,
    });

    return (
        <div className="notfound-page">
            <div className="notfound-container">
                <div className="notfound-icon" aria-hidden="true">
                    <Camera size={36} />
                </div>
                <p className="notfound-code">404</p>
                <h1>Trang bạn tìm không còn ở đây</h1>
                <p className="notfound-subtitle">
                    Có thể đường dẫn đã cũ, hoặc ảnh đã được di chuyển. Quay lại trang chủ
                    hoặc khám phá các gói chụp của {BRAND.nameLong} nhé.
                </p>
                <div className="notfound-actions">
                    <Link to="/" className="notfound-cta">
                        <ArrowLeft size={15} /> Về trang chủ
                    </Link>
                    <Link to="/packages" className="notfound-cta notfound-cta--secondary">
                        Xem gói chụp
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default NotFoundPage;
