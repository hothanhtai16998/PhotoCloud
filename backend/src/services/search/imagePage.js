import Image from '../../models/Image.js';

export function fetchImagePage(query, sort, skip, limit) {
  return Promise.all([
    Image.find(query)
      .populate('uploadedBy', 'username displayName avatarUrl')
      .populate({
        path: 'imageCategory',
        select: 'name description isActive',

        justOne: true,
        match: { isActive: true },
      })

      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Object.keys(query).length > 0
      ? Image.countDocuments(query)
      : Image.estimatedDocumentCount(),
  ]);
}
