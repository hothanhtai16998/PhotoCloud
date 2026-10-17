interface Props {
	count?: number;
}

export function CollectionsGridSkeleton({ count = 6 }: Props) {
	return (
		<div className="collections-skeleton-grid" role="status" aria-live="polite" aria-label="Đang tải bộ sưu tập">
			{Array.from({ length: count }, (_, i) => (
				<div className="collection-skeleton" key={i} aria-hidden="true">
					<div className="collection-skeleton-cover" />
					<div className="collection-skeleton-body">
						<div className="collection-skeleton-line collection-skeleton-line-title" />
						<div className="collection-skeleton-line collection-skeleton-line-meta" />
					</div>
				</div>
			))}
		</div>
	);
}
