import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Share2, Mail, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Collection } from '@/types/collection';
import { collectionService } from '@/services/collectionService';
import './CollectionShare.css';

interface CollectionShareProps {
	collection: Collection;
}

export const CollectionShare = memo(({ collection }: CollectionShareProps) => {
	const [showShareMenu, setShowShareMenu] = useState(false);
	const [positionBelow, setPositionBelow] = useState(false);
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
	const shareButtonRef = useRef<HTMLButtonElement>(null);
	const shareMenuRef = useRef<HTMLDivElement>(null);

	// Check available space and position menu accordingly
	useEffect(() => {
		if (!showShareMenu || !shareButtonRef.current) return;

		const checkPosition = () => {
			const buttonRect = shareButtonRef.current?.getBoundingClientRect();

			if (buttonRect) {
				const spaceAbove = buttonRect.top;
				const spaceBelow = window.innerHeight - buttonRect.bottom;
				const estimatedMenuHeight = 350;
				const requiredSpace = estimatedMenuHeight + 20;

				// Calculate menu position
				const menuWidth = 200; // min-width from CSS
				const left = buttonRect.right - menuWidth;
				const top = buttonRect.bottom + 12;

				setMenuPosition({
					top: top,
					left: Math.max(12, left) // Ensure menu doesn't go off-screen left
				});

				if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
					setPositionBelow(true);
				} else {
					setPositionBelow(false);
				}
			}
		};

		checkPosition();
		const timer = setTimeout(checkPosition, 50);
		const timer2 = setTimeout(checkPosition, 200);

		window.addEventListener('scroll', checkPosition, true);
		window.addEventListener('resize', checkPosition);

		let resizeObserver: ResizeObserver | null = null;
		if (shareMenuRef.current) {
			resizeObserver = new ResizeObserver(checkPosition);
			resizeObserver.observe(shareMenuRef.current);
		}

		return () => {
			clearTimeout(timer);
			clearTimeout(timer2);
			window.removeEventListener('scroll', checkPosition, true);
			window.removeEventListener('resize', checkPosition);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	}, [showShareMenu]);

	// Close share menu when clicking outside
	useEffect(() => {
		if (!showShareMenu) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				shareButtonRef.current &&
				!shareButtonRef.current.contains(target) &&
				!target.closest('.collection-share-menu')
			) {
				setShowShareMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showShareMenu]);

	// Get share URL and text
	const getShareData = useCallback(() => {
		const shareUrl = `${window.location.origin}/collections/${collection._id}`;
		const shareText = `Check out this collection: ${collection.name}`;
		return { shareUrl, shareText };
	}, [collection._id, collection.name]);

	// Handle share to Facebook
	const handleShareFacebook = useCallback(() => {
		const { shareUrl } = getShareData();
		const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
		window.open(facebookUrl, '_blank', 'width=600,height=400');
		// Track share for notification
		collectionService.trackCollectionShare(collection._id);
		setShowShareMenu(false);
	}, [getShareData, collection._id]);

	// Handle share to Twitter
	const handleShareTwitter = useCallback(() => {
		const { shareUrl, shareText } = getShareData();
		const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
		window.open(twitterUrl, '_blank', 'width=600,height=400');
		// Track share for notification
		collectionService.trackCollectionShare(collection._id);
		setShowShareMenu(false);
	}, [getShareData, collection._id]);

	// Handle share via Email
	const handleShareEmail = useCallback(() => {
		const { shareUrl, shareText } = getShareData();
		const emailUrl = `mailto:?subject=${encodeURIComponent(collection.name)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
		window.location.href = emailUrl;
		// Track share for notification
		collectionService.trackCollectionShare(collection._id);
		setShowShareMenu(false);
	}, [getShareData, collection.name, collection._id]);

	// Handle share via Web Share API
	const handleShareVia = useCallback(async () => {
		const { shareUrl, shareText } = getShareData();

		if (navigator.share) {
			try {
				await navigator.share({
					title: collection.name,
					text: shareText,
					url: shareUrl,
				});
				// Track share for notification
				collectionService.trackCollectionShare(collection._id);
				toast.success('Đã chia sẻ bộ sưu tập');
				setShowShareMenu(false);
			} catch (error) {
				if ((error as Error).name !== 'AbortError') {
					console.error('Share failed:', error);
					toast.error('Không thể chia sẻ. Vui lòng thử lại.');
				}
			}
		} else {
			toast.error('Trình duyệt của bạn không hỗ trợ tính năng này');
		}
	}, [getShareData, collection.name, collection._id]);

	// Handle copy link
	const handleCopyLink = useCallback(async () => {
		const { shareUrl } = getShareData();
		try {
			await navigator.clipboard.writeText(shareUrl);
			// Track share for notification
			collectionService.trackCollectionShare(collection._id);
			toast.success('Đã sao chép liên kết vào clipboard');
			setShowShareMenu(false);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = shareUrl;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			// Track share for notification
			collectionService.trackCollectionShare(collection._id);
			toast.success('Đã sao chép liên kết vào clipboard');
			setShowShareMenu(false);
		}
	}, [getShareData, collection._id]);

	// Handle share button click
	const handleShare = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setShowShareMenu(!showShareMenu);
	}, [showShareMenu]);

	return (
		<div style={{ position: 'relative', zIndex: 10000, isolation: 'isolate' }}>
			<button
				ref={shareButtonRef}
				className={`collection-share-btn ${showShareMenu ? 'active' : ''}`}
				onClick={handleShare}
				title="Chia sẻ bộ sưu tập"
			>
				<Share2 size={18} />
			</button>
			{/* Share Menu */}
			{showShareMenu && (
				<div
					ref={shareMenuRef}
					className={`collection-share-menu-wrapper ${positionBelow ? 'position-below' : ''}`}
					onClick={(e) => e.stopPropagation()}
					style={{
						position: 'fixed',
						top: `${menuPosition.top}px`,
						left: `${menuPosition.left}px`,
						right: 'auto',
					}}
				>
					<div className="collection-share-menu">
						<button
							className="collection-share-menu-item"
							onClick={(e) => {
								e.stopPropagation();
								handleShareFacebook();
							}}
						>
							<div className="collection-share-menu-icon facebook-icon">f</div>
							<span>Facebook</span>
						</button>
						<button
							className="collection-share-menu-item"
							onClick={(e) => {
								e.stopPropagation();
								handleShareTwitter();
							}}
						>
							<div className="collection-share-menu-icon twitter-icon">X</div>
							<span>Twitter</span>
						</button>
						<button
							className="collection-share-menu-item"
							onClick={(e) => {
								e.stopPropagation();
								handleShareEmail();
							}}
						>
							<Mail size={20} className="collection-share-menu-icon-svg" />
							<span>Email</span>
						</button>
						<button
							className="collection-share-menu-item"
							onClick={(e) => {
								e.stopPropagation();
								handleShareVia();
							}}
						>
							<Share2 size={20} className="collection-share-menu-icon-svg" />
							<span>Share via...</span>
						</button>
						<div className="collection-share-menu-divider" />
						<button
							className="collection-share-menu-item"
							onClick={(e) => {
								e.stopPropagation();
								handleCopyLink();
							}}
						>
							<LinkIcon size={20} className="collection-share-menu-icon-svg" />
							<span>Copy link</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
});

CollectionShare.displayName = 'CollectionShare';

