import { useState, useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import './TagInput.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
}

export const TagInput = ({
  tags,
  onChange,
  placeholder = 'Nhập tag và nhấn Enter...',
  maxTags = 20,
  maxTagLength = 50,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    
    // Validate tag
    if (!trimmedTag) return;
    if (trimmedTag.length > maxTagLength) {
      alert(`Tag không được vượt quá ${maxTagLength} ký tự`);
      return;
    }
    if (tags.length >= maxTags) {
      alert(`Tối đa ${maxTags} tags`);
      return;
    }
    if (tags.includes(trimmedTag)) {
      // Tag already exists, just clear input
      setInputValue('');
      return;
    }

    onChange([...tags, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      const lastTag = tags[tags.length - 1];
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Split by comma or newline and add each as a tag
    const newTags = pastedText
      .split(/[,\n]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    newTags.forEach(tag => {
      if (tags.length < maxTags && !tags.includes(tag.toLowerCase())) {
        addTag(tag);
      }
    });
  };

  return (
    <div className="tag-input-container">
      <div className="tag-input-wrapper">
        {tags.map((tag, index) => (
          <span key={index} className="tag-item">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="tag-remove"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="tag-input-field"
          maxLength={maxTagLength}
        />
      </div>
      <div className="tag-input-hint">
        {tags.length}/{maxTags} tags • Nhấn Enter hoặc dấu phẩy để thêm tag
      </div>
    </div>
  );
};


