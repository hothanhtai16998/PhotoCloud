import Header from "@/components/Header";
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Facebook, Twitter } from "lucide-react";
import { authorInfo } from "@/config/authorInfo";
import "./AboutPage.css";

function AboutPage() {

    return (
        <div className="about-page">
            <Header />
            <div className="about-container">
                <div className="about-content">
                    <h1 className="about-title">Về chúng tôi</h1>
                    <p className="about-subtitle">Thông tin liên hệ và giới thiệu</p>

                    <div className="about-section">
                        <div className="about-card">
                            <h2 className="card-title">Thông tin liên hệ</h2>
                            <div className="contact-info">
                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Mail size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Email</span>
                                        <a href={`mailto:${authorInfo.email}`} className="contact-value">
                                            {authorInfo.email}
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Phone size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Điện thoại</span>
                                        <a href={`tel:${authorInfo.phone}`} className="contact-value">
                                            {authorInfo.phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Địa chỉ</span>
                                        <span className="contact-value">{authorInfo.address}</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Globe size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Website</span>
                                        <a
                                            href={authorInfo.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-value"
                                        >
                                            {authorInfo.website}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="about-card">
                            <h2 className="card-title">Giới thiệu</h2>
                            <p className="bio-text">{authorInfo.bio}</p>
                        </div>

                        <div className="about-card">
                            <h2 className="card-title">Mạng xã hội</h2>
                            <div className="social-links">
                                {authorInfo.social.linkedin && (
                                    <a
                                        href={authorInfo.social.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="LinkedIn"
                                    >
                                        <Linkedin size={24} />
                                        <span>LinkedIn</span>
                                    </a>
                                )}
                                {authorInfo.social.github && (
                                    <a
                                        href={authorInfo.social.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="GitHub"
                                    >
                                        <Github size={24} />
                                        <span>GitHub</span>
                                    </a>
                                )}
                                {authorInfo.social.facebook && (
                                    <a
                                        href={authorInfo.social.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="Facebook"
                                    >
                                        <Facebook size={24} />
                                        <span>Facebook</span>
                                    </a>
                                )}
                                {authorInfo.social.tiktok && (
                                    <a
                                        href={authorInfo.social.tiktok}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="Twitter"
                                    >
                                        <Twitter size={24} />
                                        <span>Tiktok</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AboutPage;

