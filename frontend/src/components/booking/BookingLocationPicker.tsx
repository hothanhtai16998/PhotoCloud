import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Camera, Check, ChevronDown } from 'lucide-react';
import type { BookingLocationType } from '@/types/booking';

const locations: { value: BookingLocationType; label: string }[] = [
    { value: 'outdoor', label: 'Ngoại cảnh' },
    { value: 'studio', label: 'Studio' },
    { value: 'home', label: 'Tại nhà' },
    { value: 'other', label: 'Khác' },
];

export function BookingLocationPicker({ value, onChange }: { value: BookingLocationType; onChange: (value: BookingLocationType) => void }) {
    return <div className="booking-location-field">
        <span className="booking-field-label">Loại địa điểm</span>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger className="booking-location-trigger" aria-label={`Loại địa điểm: ${locations.find(item => item.value === value)?.label}`}>
                <Camera size={18} aria-hidden="true" />
                <span>{locations.find(item => item.value === value)?.label}</span>
                <ChevronDown size={16} aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className="booking-location-menu" sideOffset={6} align="start" collisionPadding={16} aria-label="Loại địa điểm">
                    <DropdownMenu.RadioGroup value={value} onValueChange={next => {
                        const location = locations.find(item => item.value === next);
                        if (location) onChange(location.value);
                    }}>
                        {locations.map(location => <DropdownMenu.RadioItem className="booking-location-item" key={location.value} value={location.value}>
                            {location.label}<DropdownMenu.ItemIndicator><Check size={17} /></DropdownMenu.ItemIndicator>
                        </DropdownMenu.RadioItem>)}
                    </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>;
}
