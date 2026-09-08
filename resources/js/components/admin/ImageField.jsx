import React, { useRef, useState } from 'react';
import { ImageUp, Link2, X } from 'lucide-react';
import { adminUploadImage, generalError } from '@/lib/api';
import { errorClass, fieldClass, ghostButtonClass, labelClass } from '@/components/account/ui';

/* One image control for both the product form and the settings screen.
   Uploading is the main path now, but pasting a URL has to stay: the whole
   existing catalog points at the previous site builder's CDN, and those
   entries must remain editable without re-shooting the photo. */
const ImageField = ({ label, value, onChange, error, hint }) => {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [pasting, setPasting] = useState(false);

    const pick = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadError('');
        setProgress(0);
        setUploading(true);
        try {
            onChange(await adminUploadImage(file, setProgress));
        } catch (err) {
            setUploadError(
                err?.response?.data?.errors?.file?.[0] ||
                    generalError(err, 'Could not upload that image.')
            );
        } finally {
            setUploading(false);
            // Cleared so picking the same file again still fires a change event.
            event.target.value = '';
        }
    };

    return (
        <div className="block">
            <span className={labelClass}>{label}</span>

            <div className="flex items-start gap-4">
                {value ? (
                    <img
                        src={value}
                        alt=""
                        className="h-24 w-20 shrink-0 border border-foreground/40 bg-secondary object-cover"
                    />
                ) : (
                    <div className="flex h-24 w-20 shrink-0 items-center justify-center border border-dashed border-foreground/40 text-foreground/30">
                        <ImageUp className="h-5 w-5" />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                            className={ghostButtonClass}
                        >
                            <ImageUp className="h-3.5 w-3.5" />
                            {uploading ? `Uploading ${progress}%` : value ? 'Replace' : 'Upload image'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPasting((p) => !p)}
                            className={ghostButtonClass}
                        >
                            {pasting ? <X className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                            {pasting ? 'Close' : 'Use a URL'}
                        </button>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={pick}
                        className="hidden"
                    />

                    {pasting && (
                        <input
                            value={value ?? ''}
                            onChange={(e) => onChange(e.target.value)}
                            className={`${fieldClass} mt-2`}
                            placeholder="https://…"
                        />
                    )}

                    <p className="mt-2 break-all font-label text-[10px] tracking-[0.08em] text-foreground/45">
                        {value || 'No image yet'}
                    </p>
                    <p className="mt-1 font-label text-[10px] uppercase tracking-[0.12em] text-foreground/40">
                        {hint ?? 'JPG, PNG or WebP • up to 5 MB'}
                    </p>
                </div>
            </div>

            {(uploadError || error) && <p className={errorClass}>{uploadError || error}</p>}
        </div>
    );
};

export default ImageField;
