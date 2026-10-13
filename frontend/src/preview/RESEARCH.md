# PhotoCloud spatial preview

Local preview: `/studio-preview.html?v=3`. This is an isolated prototype, not the production homepage. Booking stays browser-local and sends no request.

## References inspected

- [IbtikarZ photography portfolio](https://portfolio.ibtikarz.com/): curved image carousel, large typography and direct manipulation of photographs. Applied to `SpatialGallery.tsx`, with explicit category controls and a booking action outside the canvas.
- [Adam's Gallery](https://www.adamsmuseum.art/): physical gallery framing and selectable artwork. Applied to the studio's framed photographs and direct image selection, while keeping normal page navigation for booking.
- [Bruno Simon](https://bruno-simon.com/): the author's documentation describes a complete interactive Three.js world and multiple input methods. Used as a reference for scene specificity and input feedback; no driving or game mechanics were added.
- [Emons](https://emons.com/home-en): inspected as the logistics reference visible in the supplied reel. The current visit did not expose the original 3D scene, so it was not used as evidence of current animation behavior.

## Implemented

- Rounded, extruded studio portals, metal and coated materials, environment reflections, softbox equipment, camera/tripod, bench and circular stage.
- A multi-point camera path driven by natural scrolling, with interpolated position, target and asymmetric desktop framing.
- Raycast selection moves the chosen photograph into the center display and selects the corresponding booking package.
- A separate curved gallery with mouse dragging, touch swipe detection, category buttons, previous/next controls and image viewing.
- Local image assets for reliable texture loading. Photos are illustrative Unsplash images, not PhotoCloud client work.
- GPU drawing skips offscreen and hidden-page views; pixel ratio is capped. Reduced motion disables automatic camera traversal and idle movement.

## Validation

Focused TypeScript check and production preview build; Playwright screenshots at desktop and 390/320px mobile; direct canvas selection; gallery dragging; correct package preselection; all four booking steps; full image dialog; reduced-motion mode; canvas pixel comparisons before/after camera and gallery movement.

## Remaining production work

Replace illustrative images with approved studio work, confirm pricing and policies, connect the existing booking API, and profile on representative physical phones. The curved gallery repeats three representative collections around its ring; it does not imply nine distinct client galleries.
