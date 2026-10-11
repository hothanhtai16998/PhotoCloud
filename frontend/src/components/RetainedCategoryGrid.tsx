import { useState } from 'react';
import { NoFlashGrid, type NoFlashGridProps } from './NoFlashGrid/NoFlashGrid';

// Keep recently viewed cards mounted, so switching back does not recreate img
// elements, replay their loading state, or ask the browser to decode them again.
export function RetainedCategoryGrid(props: NoFlashGridProps) {
  const key = props.images.map(image => image._id).join('|');
  const [views, setViews] = useState([{ key, images: props.images }]);
  const current = views.find(view => view.key === key);
  if (!current || current.images !== props.images || views[views.length - 1].key !== key) {
    setViews([...views.filter(view => view.key !== key), { key, images: props.images }].slice(-3));
  }
  const rendered = current ? views : [...views, { key, images: props.images }].slice(-3);
  return <div className="retained-category-grid">
    {rendered.map(view => {
      const active = view.key === key;
      return <div key={view.key} className="retained-category-view"
        data-active={active} aria-hidden={!active} inert={!active}>
        <NoFlashGrid {...props} images={active ? props.images : view.images}
          containerId={active ? 'image-grid-container' : null}
          loading={active && props.loading} pagination={active ? props.pagination : null}
          onLoadData={active ? props.onLoadData : undefined}
          onLoadMore={active ? props.onLoadMore : undefined} />
      </div>;
    })}
  </div>;
}
