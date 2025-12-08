import { useState, useEffect } from "react";
import { Settings, Star, Smartphone, Eye, Zap } from "lucide-react";
import "./ContactOptionSelector.css";

type ContactOption = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P";
type Category = "all" | "recommended" | "mobile" | "minimal" | "visible";

interface ContactOptionSelectorProps {
    currentOption: ContactOption;
    onOptionChange: (option: ContactOption) => void;
}

function ContactOptionSelector({ currentOption, onOptionChange }: ContactOptionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState<Category>("all");

    // Load saved option from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("contactButtonOption") as ContactOption | null;
        if (saved && ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"].includes(saved)) {
            onOptionChange(saved);
        }
    }, [onOptionChange]);

    const handleOptionChange = (option: ContactOption) => {
        onOptionChange(option);
        localStorage.setItem("contactButtonOption", option);
        setIsOpen(false);
    };

    const options = [
        { 
            value: "A" as ContactOption, 
            label: "Button → Modal", 
            description: "Simple button opens centered modal",
            category: ["recommended", "minimal"] as Category[],
            bestFor: "Most websites",
            pros: ["Simple", "Familiar", "Clean"]
        },
        { 
            value: "B" as ContactOption, 
            label: "Button → Drawer", 
            description: "Button opens slide-in drawer from right",
            category: ["recommended", "mobile"] as Category[],
            bestFor: "Mobile-friendly sites",
            pros: ["Mobile optimized", "Space efficient"]
        },
        { 
            value: "C" as ContactOption, 
            label: "Expandable", 
            description: "Button expands to show quick info, then opens modal",
            category: ["recommended"] as Category[],
            bestFor: "Quick access needed",
            pros: ["Two-step interaction", "Quick preview"]
        },
        { 
            value: "D" as ContactOption, 
            label: "Mini Panel", 
            description: "Always-visible panel with quick contact info",
            category: ["visible", "recommended"] as Category[],
            bestFor: "High visibility needed",
            pros: ["Always visible", "No click needed"]
        },
        { 
            value: "E" as ContactOption, 
            label: "Multi-Button FAB", 
            description: "Material Design style - expands to show multiple options",
            category: ["mobile"] as Category[],
            bestFor: "Multiple contact methods",
            pros: ["Multiple actions", "Modern design"]
        },
        { 
            value: "F" as ContactOption, 
            label: "Bottom Sheet", 
            description: "Mobile-first - slides up from bottom",
            category: ["mobile", "recommended"] as Category[],
            bestFor: "Mobile apps/websites",
            pros: ["Native mobile feel", "Easy to dismiss"]
        },
        { 
            value: "G" as ContactOption, 
            label: "Hover Tooltip", 
            description: "Hover shows quick info, click opens full modal",
            category: ["minimal"] as Category[],
            bestFor: "Desktop-focused sites",
            pros: ["Minimal space", "Quick preview"]
        },
        { 
            value: "H" as ContactOption, 
            label: "Split Action", 
            description: "Split button - quick call action + more info",
            category: ["recommended"] as Category[],
            bestFor: "Phone-heavy businesses",
            pros: ["Quick call", "Two actions"]
        },
        { 
            value: "I" as ContactOption, 
            label: "Chat Bubble", 
            description: "Chat bubble style with messaging interface",
            category: ["recommended"] as Category[],
            bestFor: "Support/chat sites",
            pros: ["Familiar chat UI", "Friendly"]
        },
        { 
            value: "J" as ContactOption, 
            label: "Corner Ribbon", 
            description: "Fixed ribbon in corner with key info",
            category: ["visible", "minimal"] as Category[],
            bestFor: "Minimal but visible",
            pros: ["Always visible", "Compact"]
        },
        { 
            value: "K" as ContactOption, 
            label: "Slide-out Tab", 
            description: "Thin tab on edge that slides out panel",
            category: ["minimal"] as Category[],
            bestFor: "Desktop sites",
            pros: ["Hidden until needed", "Space efficient"]
        },
        { 
            value: "L" as ContactOption, 
            label: "Pulsing Button", 
            description: "Animated pulsing button to draw attention",
            category: ["recommended"] as Category[],
            bestFor: "Attention-grabbing",
            pros: ["Eye-catching", "Draws attention"]
        },
        { 
            value: "M" as ContactOption, 
            label: "Floating Menu", 
            description: "Multiple contact options in floating menu",
            category: ["mobile"] as Category[],
            bestFor: "Multiple contact methods",
            pros: ["Multiple options", "Organized"]
        },
        { 
            value: "N" as ContactOption, 
            label: "Sticky Contact Bar", 
            description: "Thin bar at bottom with contact info",
            category: ["visible", "recommended"] as Category[],
            bestFor: "Maximum visibility",
            pros: ["Always visible", "Full width", "Professional"]
        },
        { 
            value: "O" as ContactOption, 
            label: "Uiverse Card Style", 
            description: "Animated card with gradient background and sliding boxes",
            category: ["recommended"] as Category[],
            bestFor: "Modern, interactive design",
            pros: ["Beautiful animations", "Unique design", "Interactive"]
        },
        { 
            value: "P" as ContactOption, 
            label: "Uiverse Card Variation", 
            description: "Card with white border, purple-pink-yellow gradient, and 'Socials' text",
            category: ["recommended"] as Category[],
            bestFor: "Social media focused",
            pros: ["White border accent", "Vibrant gradient", "Text logo"]
        },
    ];

    const filteredOptions = category === "all" 
        ? options 
        : options.filter(opt => opt.category.includes(category));

    return (
        <div className="contact-option-selector">
            <button
                className="selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Contact Button Option"
                title="Switch Contact Button Style"
            >
                <Settings size={18} />
                <span className="selector-label">Option {currentOption}</span>
            </button>

            {isOpen && (
                <>
                    <div className="selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="selector-menu">
                        <div className="selector-menu-header">
                            <h3>Select Contact Button Style</h3>
                            <p className="selector-subtitle">Choose which design you prefer</p>
                            
                            {/* Quick Recommendations */}
                            <div className="quick-recommendations">
                                <button
                                    className={`quick-rec-btn ${category === "recommended" ? "active" : ""}`}
                                    onClick={() => setCategory("recommended")}
                                >
                                    <Star size={14} />
                                    <span>Recommended</span>
                                </button>
                                <button
                                    className={`quick-rec-btn ${category === "visible" ? "active" : ""}`}
                                    onClick={() => setCategory("visible")}
                                >
                                    <Eye size={14} />
                                    <span>Always Visible</span>
                                </button>
                                <button
                                    className={`quick-rec-btn ${category === "mobile" ? "active" : ""}`}
                                    onClick={() => setCategory("mobile")}
                                >
                                    <Smartphone size={14} />
                                    <span>Mobile-First</span>
                                </button>
                                <button
                                    className={`quick-rec-btn ${category === "minimal" ? "active" : ""}`}
                                    onClick={() => setCategory("minimal")}
                                >
                                    <Zap size={14} />
                                    <span>Minimal</span>
                                </button>
                                <button
                                    className={`quick-rec-btn ${category === "all" ? "active" : ""}`}
                                    onClick={() => setCategory("all")}
                                >
                                    All
                                </button>
                            </div>
                        </div>
                        <div className="selector-options">
                            {filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`selector-option ${currentOption === option.value ? "active" : ""}`}
                                    onClick={() => handleOptionChange(option.value)}
                                >
                                    <div className="option-header">
                                        <div className="option-title-row">
                                            <span className="option-label">{option.label}</span>
                                            {option.category.includes("recommended") && (
                                                <Star size={14} className="recommended-icon" />
                                            )}
                                        </div>
                                        {currentOption === option.value && (
                                            <span className="option-badge">Active</span>
                                        )}
                                    </div>
                                    <span className="option-description">{option.description}</span>
                                    <div className="option-meta">
                                        <span className="option-best-for">Best for: {option.bestFor}</span>
                                        <div className="option-pros">
                                            {option.pros.map((pro, idx) => (
                                                <span key={idx} className="pro-tag">{pro}</span>
                                            ))}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default ContactOptionSelector;

