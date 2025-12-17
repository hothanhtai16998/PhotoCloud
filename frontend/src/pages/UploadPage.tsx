import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useImageStore } from '@/stores/useImageStore';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Upload, TrendingUp } from 'lucide-react';
import type { Image, PreUploadResponse, FinalizeImageData } from '@/types/image';
import { compressImage } from '@/utils/imageCompression';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { imageService } from '@/services/imageService';
import { uploadSchema, type UploadFormValues } from '@/types/forms';
import { uploadConfig } from '@/config/uploadConfig';
import { t } from '@/i18n';
import './UploadPage.css';

function UploadPage() {
    const { images, fetchImages } = useImageStore();
    const navigate = useNavigate();
    const [categoryImages, setCategoryImages] = useState<Array<{ category: string; images: Image[] }>>([]);
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadSchema),
    });

    // Upload state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [preUploadData, setPreUploadData] = useState<PreUploadResponse | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const watchedFile = watch('image');

    // Fetch images by category for display
    useEffect(() => {
        const { categories, imagesPerCategory, maxCategories, minImagesPerCategory } = uploadConfig;

        const processCategoryImages = (allImages: Image[]) => {
            const categoryData = [];

            // Group images by category
            for (const category of categories) {
                const categoryImgs = allImages.filter(img => {
                    const categoryName = typeof img.imageCategory === 'string'
                        ? img.imageCategory
                        : img.imageCategory?.name;
                    return categoryName && categoryName.toLowerCase() === category.toLowerCase();
                }).slice(0, imagesPerCategory);

                if (categoryImgs.length >= minImagesPerCategory) {
                    categoryData.push({ category, images: categoryImgs });
                }
            }

            // If we don't have enough category images, use general images and group them
            if (categoryData.length === 0 && allImages.length > 0) {
                const shuffled = [...allImages].sort(() => 0.5 - Math.random());
                // Create groups from shuffled images
                for (let i = 0; i < maxCategories && shuffled.length >= imagesPerCategory; i++) {
                    categoryData.push({
                        category: categories[i] || 'Featured',
                        images: shuffled.slice(i * imagesPerCategory, (i + 1) * imagesPerCategory)
                    });
                }
            }

            setCategoryImages(categoryData.slice(0, maxCategories));
        };

        const fetchCategoryImages = async () => {
            try {
                // Fetch all images first
                await fetchImages({ limit: 50 });
            } catch (error) {
                console.error('Failed to fetch images:', error);
            }
        };

        // If we already have images, process them
        if (images.length > 0) {
            processCategoryImages(images);
        } else {
            // Otherwise fetch first
            fetchCategoryImages();
        }
    }, [images, fetchImages]);

    // Start upload immediately when file is selected
    useEffect(() => {
        const file = watchedFile?.[0];
        if (!file) {
            // Reset state if no file
            setPreUploadData(null);
            setUploadProgress(0);
            setIsUploading(false);
            setUploadError(null);
            return;
        }

        // Start upload immediately
        const startUpload = async () => {
            setIsUploading(true);
            setUploadProgress(0);
            setUploadError(null);
            setPreUploadData(null);

            try {
                // Compress image first
                const compressedFile = await compressImage(file);

                // Pre-upload image to S3
                const result = await imageService.preUploadImage(
                    compressedFile,
                    (progress) => {
                        setUploadProgress(progress);
                    }
                );

                setPreUploadData(result);
                setUploadProgress(100);
                setIsUploading(false);
                toast.success(t('upload.uploadedSuccess'));
            } catch (error: unknown) {
                console.error('Upload error:', error);
                const errorMessage = getErrorMessage(error, 'Failed to upload image. Please try again.');
                setUploadError(errorMessage);
                setIsUploading(false);
                setUploadProgress(0);
                toast.error(errorMessage);
                // Clear file input on error
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setValue('image', null as unknown as FileList);
            }
        };

        startUpload();
    }, [watchedFile, setValue]);

    const onSubmit = async (data: UploadFormValues) => {
        // Check if upload is complete
        if (!preUploadData) {
            toast.error(t('upload.waitForUpload'));
            return;
        }

        if (isUploading) {
            toast.error(t('upload.uploadInProgress'));
            return;
        }

        setIsFinalizing(true);

        try {
            // Finalize: Only send metadata to link with pre-uploaded image
            const finalizeData: FinalizeImageData = {
                uploadId: preUploadData.uploadId,
                uploadKey: preUploadData.uploadKey,
                imageTitle: data.imageTitle.trim(),
                imageCategory: data.imageCategory.trim(),
                location: data.location?.trim() || undefined,
                cameraModel: data.cameraModel?.trim() || undefined,
            };

            await imageService.finalizeImageUpload(finalizeData);

            toast.success(t('upload.finalizeSuccess'));
            navigate('/');
        } catch (error: unknown) {
            console.error('Finalize error:', error);
            const errorMessage = getErrorMessage(error, 'Failed to finalize upload. Please try again.');
            toast.error(errorMessage);
        } finally {
            setIsFinalizing(false);
        }
    };

    const isSubmitDisabled = isUploading || !preUploadData || isFinalizing;

    return (
        <>
            <Header />
            <div className="upload-page">
                {/* Upload Progress Overlay */}
                {isUploading && (
                    <div className="upload-progress-overlay">
                        <div className="upload-progress-content">
                            <div className="upload-progress-spinner">
                                <div className="spinner-circle"></div>
                            </div>
                            <h3 className="upload-progress-title">{t('upload.uploadingTitle')}</h3>
                            <p className="upload-progress-text">{t('upload.uploadingWait')}</p>
                            <div className="upload-progress-bar-container">
                                <div
                                    className="upload-progress-bar"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="upload-progress-percent">{uploadProgress}%</p>
                        </div>
                    </div>
                )}

                <div className="upload-container">
                    <div className="upload-left">
                        <div className="upload-icon">
                            <Upload size={32} />
                        </div>
                        <h1 className="upload-title">{t('upload.startUploading')}</h1>
                        <p className="upload-description">
                            {t('upload.sharePhotos')}
                        </p>
                        <p className="upload-subdescription">
                            {t('upload.uploadHighQuality')}
                        </p>

                        <form onSubmit={handleSubmit(onSubmit)} className="upload-form">
                            <div className="form-group">
                                <Label htmlFor="image">Photo</Label>
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    {...register('image')}
                                    ref={fileInputRef}
                                />
                                {errors.image && <p className="error-text">{errors.image.message}</p>}
                                {uploadError && (
                                    <p className="error-text" style={{ marginTop: '8px' }}>
                                        {uploadError}
                                    </p>
                                )}
                                {preUploadData && !isUploading && (
                                    <p className="success-text" style={{ marginTop: '8px', color: '#10b981' }}>
                                        ✓ {t('upload.uploadedCheck')}
                                    </p>
                                )}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="imageTitle">Title</Label>
                                <Input
                                    id="imageTitle"
                                    {...register('imageTitle')}
                                    placeholder="Give your photo a title"
                                    disabled={isUploading}
                                />
                                {errors.imageTitle && <p className="error-text">{errors.imageTitle.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="imageCategory">Category</Label>
                                <Input
                                    id="imageCategory"
                                    {...register('imageCategory')}
                                    placeholder="e.g., Nature, Portrait, Architecture"
                                    disabled={isUploading}
                                />
                                {errors.imageCategory && <p className="error-text">{errors.imageCategory.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input
                                    id="location"
                                    {...register('location')}
                                    placeholder="e.g., Paris, France"
                                    disabled={isUploading}
                                />
                                {errors.location && <p className="error-text">{errors.location.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="cameraModel">Camera Model (Optional)</Label>
                                <Input
                                    id="cameraModel"
                                    {...register('cameraModel')}
                                    placeholder="e.g., Sony A7 III"
                                    disabled={isUploading}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="upload-submit-btn"
                            >
                                {isFinalizing
                                    ? t('upload.saving')
                                    : isUploading
                                        ? t('upload.uploadingProgress', { progress: uploadProgress })
                                        : !preUploadData
                                            ? t('upload.selectImage')
                                            : t('upload.submitImage')
                                }
                            </Button>
                        </form>
                    </div>

                    <div className="upload-right">
                        <div className="category-section">
                            <div className="category-header">
                                <TrendingUp size={24} className="trend-icon" />
                                <h2 className="category-title">Popular categories</h2>
                            </div>
                            <p className="category-description">
                                These categories are in high demand. Upload photos in these areas to get more visibility.
                            </p>

                            {categoryImages.length > 0 ? (
                                <div className="category-grid">
                                    {categoryImages.map((catData) => (
                                        <div key={catData.category} className="category-card">
                                            <div className="category-name">{catData.category}</div>
                                            <div className="category-images">
                                                {catData.images.map((img, idx) => (
                                                    <div key={idx} className="category-image">
                                                        <img src={img.imageUrl} alt={img.imageTitle || catData.category} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="category-placeholder">
                                    <p>Loading category examples...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default UploadPage;
