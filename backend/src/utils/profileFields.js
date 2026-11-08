// Input validation constants
export const VALIDATION_RULES = {
    bio: { max: 500 },
    location: { max: 100 },
    website: { max: 255 },
    instagram: { max: 30 },
    twitter: { max: 15 },
    facebook: { max: 50 },
    phone: { max: 20 },
    displayName: { max: 100 },
};

// Helper function to validate input length
export const validateInputLength = (field, value, rules) => {
    if (!value) return true;
    const trimmed = String(value).trim();
    if (rules.max && trimmed.length > rules.max) {
        throw new Error(`${field} exceeds maximum length of ${rules.max}`);
    }
    if (rules.min && trimmed.length < rules.min) {
        throw new Error(`${field} must be at least ${rules.min} characters`);
    }
    return true;
};

const normalizeValue = (value) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
};


// Preserve field order and validation-before-normalization used by profile editing.
export function buildProfileFieldsUpdate(currentUser, input) {
    const updateData = {};
    const changedFields = [];
    for (const [field, label] of [['bio', 'Bio'], ['location', 'Location'], ['phone', 'Phone'], ['website', 'Website'], ['instagram', 'Instagram'], ['twitter', 'Twitter'], ['facebook', 'Facebook']]) {
        const value = input[field];
        if (value === undefined) continue;
        validateInputLength(label, value, VALIDATION_RULES[field]);
        let normalized = normalizeValue(value);
        if (field === "instagram" || field === "twitter") normalized = normalizeValue(String(value || "").trim().replace(/^@/, ""));
        if (field === "website" && normalized && !normalized.startsWith("http://") && !normalized.startsWith("https://")) normalized = `https://${normalized}`;
        if (normalized !== normalizeValue(currentUser[field])) {
            updateData[field] = normalized;
            changedFields.push(field);
        }
    }
    return { updateData, changedFields };
}
