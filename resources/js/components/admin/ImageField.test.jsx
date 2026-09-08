import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    adminUploadImage: vi.fn(),
}));

import { adminUploadImage } from '@/lib/api';
import ImageField from '@/components/admin/ImageField';

/** Stands in for the admin form, so the value the field reports is observable. */
const Harness = ({ initial = '' }) => {
    const [value, setValue] = useState(initial);

    return (
        <>
            <ImageField label="Product photo" value={value} onChange={setValue} />
            <p data-testid="value">{value || 'empty'}</p>
        </>
    );
};

const filePicker = () => document.querySelector('input[type="file"]');

const choose = (file) => fireEvent.change(filePicker(), { target: { files: [file] } });

const jpeg = (name = 'shirt.jpg') => new File(['x'], name, { type: 'image/jpeg' });

beforeEach(() => {
    adminUploadImage.mockResolvedValue('/uploads/abc123.jpg');
});

describe('ImageField', () => {
    it('uploads the chosen file and reports the stored path', async () => {
        render(<Harness />);

        choose(jpeg());

        await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('/uploads/abc123.jpg'));
        expect(adminUploadImage).toHaveBeenCalledWith(expect.any(File), expect.any(Function));
    });

    it('starts empty and says so rather than showing a broken image', () => {
        render(<Harness />);

        expect(screen.getByText('No image yet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
    });

    it('offers to replace once there is a photo', () => {
        render(<Harness initial="/uploads/existing.jpg" />);

        expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument();
    });

    /* The existing catalog is entirely external URLs from the old site builder,
       so those entries have to stay editable without re-shooting the photo. */
    it('still accepts a pasted URL', () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole('button', { name: /use a url/i }));
        fireEvent.change(screen.getByPlaceholderText('https://…'), {
            target: { value: 'https://images.hostinger.com/shirt.png' },
        });

        expect(screen.getByTestId('value')).toHaveTextContent('https://images.hostinger.com/shirt.png');
    });

    it('shows the server’s rejection and keeps the old photo', async () => {
        adminUploadImage.mockRejectedValue({
            response: { status: 422, data: { errors: { file: ['Images must be JPG, PNG or WebP.'] } } },
        });
        render(<Harness initial="/uploads/existing.jpg" />);

        choose(new File(['x'], 'logo.svg', { type: 'image/svg+xml' }));

        expect(await screen.findByText(/must be jpg, png or webp/i)).toBeInTheDocument();
        expect(screen.getByTestId('value')).toHaveTextContent('/uploads/existing.jpg');
    });

    it('reports progress while the file is going up', async () => {
        let report;
        adminUploadImage.mockImplementation(
            (_file, onProgress) =>
                new Promise((resolve) => {
                    report = () => onProgress(42);
                    setTimeout(() => resolve('/uploads/done.jpg'), 0);
                })
        );

        render(<Harness />);
        choose(jpeg());

        act(() => report());
        expect(await screen.findByText(/uploading 42%/i)).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('/uploads/done.jpg'));
    });
});
