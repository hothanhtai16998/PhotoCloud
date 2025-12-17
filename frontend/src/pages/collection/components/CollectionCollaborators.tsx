import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, UserPlus, X, Mail, Crown, Edit, Eye, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/useUserStore';
import { userService, type UserSearchResult } from '@/services/userService';
// import { ConfirmModal } from '@/pages/admin/components/modals';
import './CollectionCollaborators.css';

// Custom event to trigger notification refresh
const NOTIFICATION_REFRESH_EVENT = 'notification:refresh';

// eslint-disable-next-line react-refresh/only-export-components
export const triggerNotificationRefresh = () => {
	window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT));
};

interface CollectionCollaboratorsProps {
	collection: Collection;
	onCollectionUpdate: (updatedCollection: Collection) => void;
	isOwner: boolean;
	userPermission?: 'view' | 'edit' | 'admin';
}

export default function CollectionCollaborators({
	collection,
	onCollectionUpdate,
	isOwner,
	userPermission,
}: CollectionCollaboratorsProps) {
	const { user: currentUser } = useUserStore();
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [invitePermission, setInvitePermission] = useState<'view' | 'edit' | 'admin'>('view');
	const [inviting, setInviting] = useState(false);
	const [showCollaborators, setShowCollaborators] = useState(true);
	const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);
	const [removingCollaborator, setRemovingCollaborator] = useState<string | null>(null);
	const [_showRemoveModal, setShowRemoveModal] = useState(false);

	// User search state
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
	const searchTimeoutRef = useRef<number | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const searchResultsRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Check if user can manage collaborators (owner or admin)
	const canManageCollaborators = isOwner || userPermission === 'admin';

	// User search handler - optimized with caching
	const handleSearch = useCallback(async (query: string) => {
		if (!query || query.length < 2) {
			setSearchResults([]);
			setShowSearchResults(false);
			return;
		}

		// Cancel previous search if still in progress
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new abort controller for this search
		abortControllerRef.current = new AbortController();
		const currentAbortController = abortControllerRef.current;

		setSearching(true);
		try {
			// Use a smaller limit for faster response, with abort signal
			const results = await userService.searchUsers(query, 10);

			// Pre-compute existing collaborator emails once
			const existingCollaboratorEmails = new Set(
				collection.collaborators?.map(c =>
					typeof c.user === 'object' ? c.user.email : ''
				).filter(Boolean) || []
			);

			// Filter efficiently
			const filteredResults = (results.users || []).filter(
				(searchUser: { email: string }) =>
					!existingCollaboratorEmails.has(searchUser.email) &&
					searchUser.email !== currentUser?.email
			);

			setSearchResults(filteredResults);
			// Always show dropdown if we have a query (even if no results, to show "no results" message)
			setShowSearchResults(query.length >= 2);
		} catch (error: unknown) {
			// Ignore aborted requests
			const err = error as { name?: string; message?: string };
			if (err?.name === 'AbortError' || err?.message === 'canceled') {
				return;
			}

			console.error('Failed to search users:', error);
			setSearchResults([]);
			setShowSearchResults(false);
			// Only show error toast for actual errors, not empty results or aborted requests
			if (error instanceof Error && !error.message.includes('404') && !error.message.includes('canceled')) {
				toast.error('Không thể tìm kiếm người dùng. Vui lòng thử lại.');
			}
		} finally {
			// Only update state if this request wasn't aborted
			if (!currentAbortController.signal.aborted) {
				setSearching(false);
			}
		}
	}, [collection.collaborators, currentUser?.email]);

	// Debounced search
	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		if (searchQuery.length >= 2) {
			searchTimeoutRef.current = window.setTimeout(() => {
				handleSearch(searchQuery);
			}, 500); // Increased debounce to 500ms to reduce API calls
		} else {
			setSearchResults([]);
			setShowSearchResults(false);
		}

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [searchQuery, handleSearch]);

	// Close search results when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchResultsRef.current &&
				!searchResultsRef.current.contains(event.target as Node) &&
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target as Node)
			) {
				setShowSearchResults(false);
			}
		};

		if (showSearchResults) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
		return undefined;
	}, [showSearchResults]);

	const handleSelectUser = (user: UserSearchResult, e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setSelectedUser(user);
		setInviteEmail(user.email);
		setSearchQuery(user.displayName || user.username);
		setShowSearchResults(false);
		setSearchResults([]); // Clear results immediately
		// Blur the input to close any open dropdowns
		setTimeout(() => {
			if (searchInputRef.current) {
				searchInputRef.current.blur();
			}
		}, 0);
	};

	const handleInvite = async () => {
		const emailToInvite = selectedUser?.email || inviteEmail.trim();

		if (!emailToInvite) {
			toast.error('Vui lòng chọn hoặc nhập email người dùng');
			return;
		}

		setInviting(true);
		try {
			const updatedCollection = await collectionService.addCollaborator(
				collection._id,
				emailToInvite,
				invitePermission
			);
			onCollectionUpdate(updatedCollection);
			toast.success('Đã mời cộng tác viên thành công');

			// Option 3: Optimistic update - trigger notification refresh
			triggerNotificationRefresh();

			setShowInviteModal(false);
			setInviteEmail('');
			setSearchQuery('');
			setSelectedUser(null);
			setInvitePermission('view');
		} catch (error: unknown) {
			console.error('Failed to invite collaborator:', error);
			const axiosError = error as { response?: { data?: { message?: string } } };
			toast.error(axiosError.response?.data?.message || 'Không thể mời cộng tác viên. Vui lòng thử lại.');
		} finally {
			setInviting(false);
		}
	};

	const handleRemoveCollaboratorClick = (collaboratorId: string) => {
		setRemovingCollaborator(collaboratorId);
		setShowRemoveModal(true);
	};

	// const handleRemoveCollaboratorConfirm = async () => {
	// 	if (!removingCollaborator) return;

	// 	const collaboratorId = removingCollaborator;
	// 	setRemovingCollaborator(collaboratorId);
	// 	try {
	// 		const updatedCollection = await collectionService.removeCollaborator(
	// 			collection._id,
	// 			collaboratorId
	// 		);
	// 		onCollectionUpdate(updatedCollection);
	// 		toast.success('Đã xóa cộng tác viên');
	// 	} catch (error: unknown) {
	// 		console.error('Failed to remove collaborator:', error);
	// 		const axiosError = error as { response?: { data?: { message?: string } } };
	// 		toast.error(axiosError.response?.data?.message || 'Không thể xóa cộng tác viên. Vui lòng thử lại.');
	// 	} finally {
	// 		setRemovingCollaborator(null);
	// 		setShowRemoveModal(false);
	// 	}
	// };

	const handleUpdatePermission = async (collaboratorId: string, newPermission: 'view' | 'edit' | 'admin') => {
		setUpdatingPermission(collaboratorId);
		try {
			const updatedCollection = await collectionService.updateCollaboratorPermission(
				collection._id,
				collaboratorId,
				newPermission
			);
			onCollectionUpdate(updatedCollection);
			toast.success('Đã cập nhật quyền');
		} catch (error: unknown) {
			console.error('Failed to update permission:', error);
			const axiosError = error as { response?: { data?: { message?: string } } };
			toast.error(axiosError.response?.data?.message || 'Không thể cập nhật quyền. Vui lòng thử lại.');
		} finally {
			setUpdatingPermission(null);
		}
	};

	const getPermissionIcon = (permission: string) => {
		switch (permission) {
			case 'admin':
				return <Crown size={14} />;
			case 'edit':
				return <Edit size={14} />;
			case 'view':
				return <Eye size={14} />;
			default:
				return <Eye size={14} />;
		}
	};

	const getPermissionLabel = (permission: string) => {
		switch (permission) {
			case 'admin':
				return 'Quản trị';
			case 'edit':
				return 'Chỉnh sửa';
			case 'view':
				return 'Xem';
			default:
				return 'Xem';
		}
	};

	const collaborators = collection.collaborators || [];
	const hasCollaborators = collaborators.length > 0;

	return (
		<div className="collection-collaborators-section">
			<div className="collection-collaborators-header">
				<button
					className="collection-collaborators-toggle"
					onClick={() => setShowCollaborators(!showCollaborators)}
				>
					<Users size={18} />
					<span>Cộng tác viên ({collaborators.length})</span>
					{showCollaborators ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</button>
				{canManageCollaborators && (
					<button
						className="collection-collaborators-invite-btn"
						onClick={() => setShowInviteModal(true)}
					>
						<UserPlus size={18} />
						<span>Mời</span>
					</button>
				)}
			</div>

			{showCollaborators && (
				<div className="collection-collaborators-content">
					{!hasCollaborators ? (
						<div className="collection-collaborators-empty">
							<p>Chưa có cộng tác viên nào</p>
							{canManageCollaborators && (
								<button
									className="collection-collaborators-invite-empty-btn"
									onClick={() => setShowInviteModal(true)}
								>
									<UserPlus size={16} />
									Mời cộng tác viên đầu tiên
								</button>
							)}
						</div>
					) : (
						<div className="collection-collaborators-list">
							{collaborators.map((collab, index) => {
								const collaboratorUser = typeof collab.user === 'object' && collab.user !== null ? collab.user : null;
								if (!collaboratorUser) return null;

								const isCurrentUser = collaboratorUser._id === currentUser?._id;
								const canEdit = canManageCollaborators && !isCurrentUser;

								return (
									<div key={index} className="collection-collaborator-item">
										<div className="collection-collaborator-info">
											{collaboratorUser.avatarUrl ? (
												<img
													src={collaboratorUser.avatarUrl}
													alt={collaboratorUser.displayName || collaboratorUser.username || ''}
													className="collection-collaborator-avatar"
												/>
											) : (
												<div className="collection-collaborator-avatar-placeholder">
													{((collaboratorUser?.displayName || collaboratorUser?.username) || 'U')[0]?.toUpperCase() || 'U'}
												</div>
											)}
											<div className="collection-collaborator-details">
												<div className="collection-collaborator-name">
													{collaboratorUser.displayName || collaboratorUser.username}
													{isCurrentUser && <span className="collection-collaborator-you">(Bạn)</span>}
												</div>
												<div className="collection-collaborator-email">
													{collaboratorUser.email}
												</div>
											</div>
										</div>
										<div className="collection-collaborator-actions">
											{canEdit ? (
												<select
													className="collection-collaborator-permission-select"
													value={collab.permission}
													onChange={(e) =>
														handleUpdatePermission(
															collaboratorUser._id,
															e.target.value as 'view' | 'edit' | 'admin'
														)
													}
													disabled={updatingPermission === collaboratorUser._id}
												>
													<option value="view">Xem</option>
													<option value="edit">Chỉnh sửa</option>
													<option value="admin">Quản trị</option>
												</select>
											) : (
												<div className="collection-collaborator-permission-badge">
													{getPermissionIcon(collab.permission)}
													<span>{getPermissionLabel(collab.permission)}</span>
												</div>
											)}
											{canEdit && (
												<button
													className="collection-collaborator-remove-btn"
													onClick={() => handleRemoveCollaboratorClick(collaboratorUser._id)}
													disabled={removingCollaborator === collaboratorUser._id}
													title="Xóa cộng tác viên"
												>
													<X size={16} />
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Invite Modal */}
			{showInviteModal && (
				<>
					<div
						className="collection-collaborators-modal-overlay"
						onClick={() => {
							setShowInviteModal(false);
							setSearchQuery('');
							setSelectedUser(null);
							setInviteEmail('');
							setShowSearchResults(false);
						}}
					/>
					<div className="collection-collaborators-modal" onClick={(e) => e.stopPropagation()}>
						<div className="collection-collaborators-modal-header">
							<h3>Mời cộng tác viên</h3>
							<button
								className="collection-collaborators-modal-close"
								onClick={() => {
									setShowInviteModal(false);
									setSearchQuery('');
									setSelectedUser(null);
									setInviteEmail('');
									setShowSearchResults(false);
								}}
							>
								<X size={20} />
							</button>
						</div>
						<div className="collection-collaborators-modal-content">
							<div className="collection-collaborators-modal-form-group">
								<label htmlFor="invite-email">
									<Search size={16} />
									Tìm kiếm người dùng
								</label>
								<div className="user-search-wrapper" style={{ position: 'relative' }}>
									<input
										ref={searchInputRef}
										id="invite-email"
										type="text"
										value={searchQuery}
										onChange={(e) => {
											const newValue = e.target.value;
											setSearchQuery(newValue);
											// Clear selected user if user starts typing again
											if (selectedUser && newValue !== (selectedUser.displayName || selectedUser.username)) {
												setSelectedUser(null);
												setInviteEmail('');
											}
											if (newValue.length < 2) {
												setInviteEmail('');
												setShowSearchResults(false);
											}
										}}
										onFocus={() => {
											if (searchResults.length > 0 && !selectedUser) {
												setShowSearchResults(true);
											}
										}}
										placeholder="Tìm theo tên, username hoặc email..."
										autoFocus
									/>
									{searching && (
										<div className="user-search-loading">
											<Loader2 size={16} className="spinning" />
										</div>
									)}
									{showSearchResults && searchResults.length > 0 && !selectedUser && (
										<div ref={searchResultsRef} className="user-search-results">
											{searchResults.map((user) => (
												<div
													key={user._id}
													className="user-search-result-item"
													onClick={(e) => handleSelectUser(user, e)}
													onMouseDown={(e) => e.preventDefault()} // Prevent input blur
												>
													{user.avatarUrl ? (
														<img
															src={user.avatarUrl}
															alt={user.displayName || user.username || ''}
															className="user-search-avatar"
														/>
													) : (
														<div className="user-search-avatar-placeholder">
															{((user?.displayName || user?.username) || 'U')[0]?.toUpperCase() || 'U'}
														</div>
													)}
													<div className="user-search-info">
														<div className="user-search-name">
															{user.displayName || user.username}
														</div>
														<div className="user-search-email">{user.email}</div>
													</div>
												</div>
											))}
										</div>
									)}
									{showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searching && !selectedUser && (
										<div ref={searchResultsRef} className="user-search-results">
											<div className="user-search-no-results">
												Không tìm thấy người dùng
											</div>
										</div>
									)}
								</div>
								{selectedUser && (
									<div className="selected-user-preview">
										<Mail size={14} />
										<span>Đã chọn: {selectedUser.email}</span>
									</div>
								)}
							</div>
							<div className="collection-collaborators-modal-form-group">
								<label htmlFor="invite-permission">Quyền truy cập</label>
								<select
									id="invite-permission"
									value={invitePermission}
									onChange={(e) =>
										setInvitePermission(e.target.value as 'view' | 'edit' | 'admin')
									}
								>
									<option value="view">Xem - Chỉ xem bộ sưu tập</option>
									<option value="edit">Chỉnh sửa - Thêm/xóa ảnh</option>
									<option value="admin">Quản trị - Quản lý cộng tác viên</option>
								</select>
							</div>
						</div>
						<div className="collection-collaborators-modal-footer">
							<button
								className="collection-collaborators-modal-cancel"
								onClick={() => {
									setShowInviteModal(false);
									setSearchQuery('');
									setSelectedUser(null);
									setInviteEmail('');
									setShowSearchResults(false);
								}}
								disabled={inviting}
							>
								Hủy
							</button>
							<button
								className="collection-collaborators-modal-submit"
								onClick={handleInvite}
								disabled={inviting || (!selectedUser && !inviteEmail.trim())}
							>
								{inviting ? 'Đang mời...' : 'Gửi lời mời'}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

