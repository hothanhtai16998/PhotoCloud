import React from 'react';
import { Plus, Search, X, Filter } from 'lucide-react';

type SortBy = 'newest' | 'oldest' | 'name' | 'images';
export interface CollectionsToolbarLabels {
  title: string;
  subtitleViewer: string;
  createCollection: string;
  searchPlaceholder: string;
  clearSearch: string;
  allTags: string;
  all: string;
  filterBy: string;
  showAll: string;
  showPublicOnly: string;
  public: string;
  sortAriaLabel: string;
  sortNewest: string;
  sortOldest: string;
  sortName: string;
  sortImages: string;
}
interface Props {
  labels: CollectionsToolbarLabels;
  totalLabel?: string;
  canCreate?: boolean;
  isInitializing?: boolean;
  allTags?: string[];
  searchQuery?: string;
  selectedTag?: string | null;
  showPublicOnly?: boolean;
  sortBy?: SortBy;
  onCreate?: () => void;
  onSearchChange?: (query: string) => void;
  onTagChange?: (tag: string | null) => void;
  onPublicChange?: (value: boolean) => void;
  onSortChange?: (value: SortBy) => void;
}
export function CollectionsToolbar({ labels, totalLabel = '', canCreate = false, isInitializing = false, allTags = [], searchQuery = '', selectedTag = null, showPublicOnly = false, sortBy = 'newest', onCreate, onSearchChange, onTagChange, onPublicChange, onSortChange }: Props): React.ReactElement {
  return <section data-collections-frame>
	<header className="collections-header">
		<div className="collections-header-titles">
			<span className="collections-eyebrow" style={{ visibility: totalLabel ? 'visible' : 'hidden' }}>{totalLabel}</span>
			<h1>{labels.title}</h1>
				<p className="collections-header-subtitle">
					{labels.subtitleViewer}
				</p>
		</div>
		{canCreate && (
			<button
				className="collections-create-btn"
				type="button"
				onClick={onCreate}
			>
				<Plus size={18} aria-hidden="true" />
				{labels.createCollection}
			</button>
		)}
	</header>

	<div className="collections-filters" role="search">
		<div className="collections-search-wrapper">
			<Search size={18} className="collections-search-icon" aria-hidden="true" />
			<input
				type="search"
				className="collections-search-input"
				placeholder={labels.searchPlaceholder}
				aria-label={labels.searchPlaceholder}
				value={searchQuery}
				disabled={isInitializing}
				onChange={(e) => onSearchChange?.(e.target.value)}
			/>
			{searchQuery && (
				<button
					type="button"
					className="collections-search-clear"
					onClick={() => onSearchChange?.('')}
					aria-label={labels.clearSearch}
				>
					<X size={14} aria-hidden="true" />
				</button>
			)}
		</div>

			<div className="collections-tags-filter" aria-label={labels.allTags}>
				<button
					type="button"
					aria-pressed={!selectedTag}
					className={`collections-tag-filter-btn ${!selectedTag ? 'active' : ''}`}
					onClick={() => onTagChange?.(null)}
					title={labels.allTags}
				>
					{labels.all}
				</button>
				{allTags.map(tag => (
					<button
						key={tag}
						type="button"
						aria-pressed={selectedTag === tag}
						className={`collections-tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
						onClick={() => onTagChange?.(selectedTag === tag ? null : tag)}
						title={labels.filterBy.replace('{tag}', tag)}
					>
						{tag}
					</button>
				))}
			</div>

		<div className="collections-filter-controls">
			<button
				type="button"
				aria-pressed={showPublicOnly}
				disabled={isInitializing}
				className={`collections-filter-btn ${showPublicOnly ? 'active' : ''}`}
				onClick={() => onPublicChange?.(!showPublicOnly)}
				title={showPublicOnly ? labels.showAll : labels.showPublicOnly}
			>
				<Filter size={14} aria-hidden="true" />
				<span>{showPublicOnly ? labels.public : labels.all}</span>
			</button>
			<select
				aria-label={labels.sortAriaLabel}
				className="collections-sort-select"
				value={sortBy}
				disabled={isInitializing}
				onChange={(e) => onSortChange?.(e.target.value as SortBy)}
			>
				<option value="newest">{labels.sortNewest}</option>
				<option value="oldest">{labels.sortOldest}</option>
				<option value="name">{labels.sortName}</option>
				<option value="images">{labels.sortImages}</option>
			</select>
		</div>
	</div>
  </section>;
}
