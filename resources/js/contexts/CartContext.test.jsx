import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* vi.mock factories are hoisted above the imports, so anything they close over
   has to be hoisted with them. */
const auth = vi.hoisted(() => ({ current: { user: null } }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('@/lib/api', () => ({ getCart: vi.fn(), saveCart: vi.fn() }));

import { getCart, saveCart } from '@/lib/api';
import { CartProvider, lineKey, mergeCarts, useCart } from '@/contexts/CartContext';

const STORAGE_KEY = 'jjserow_cart_v1';

const line = (overrides = {}) => {
    const item = {
        productId: 'serow-oxford',
        colorName: 'White',
        ratio: { M: 1, L: 1, XL: 1, XXL: 1 },
        sets: 12,
        privateLabel: false,
        sample: false,
        ...overrides,
    };

    return { ...item, key: lineKey(item) };
};

const Harness = () => {
    const { items, addItem, updateSets, removeItem, clear, count, syncing } = useCart();

    return (
        <div>
            <p data-testid="count">{count}</p>
            <p data-testid="syncing">{String(syncing)}</p>
            <ul>
                {items.map((item) => (
                    <li key={item.key} data-testid="line">
                        {item.productId}/{item.colorName}:{item.sets}
                    </li>
                ))}
            </ul>
            <button onClick={() => addItem(line())}>add white</button>
            <button onClick={() => addItem(line({ colorName: 'Indigo' }))}>add indigo</button>
            <button onClick={() => updateSets(line().key, 40)}>set 40</button>
            <button onClick={() => removeItem(line().key)}>remove white</button>
            <button onClick={clear}>clear</button>
        </div>
    );
};

const renderCart = () => render(<CartProvider><Harness /></CartProvider>);

const lines = () => screen.queryAllByTestId('line').map((el) => el.textContent);

beforeEach(() => {
    auth.current = { user: null };
    getCart.mockResolvedValue([]);
    saveCart.mockResolvedValue([]);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('mergeCarts', () => {
    it('keeps lines that exist on only one side', () => {
        const local = [line({ colorName: 'Indigo' })];
        const remote = [line()];

        expect(mergeCarts(local, remote)).toHaveLength(2);
    });

    /* The usual reason a line is on both sides is that it was already synced
       from the other device, so summing would silently double the order. */
    it('takes the larger set count rather than adding the two', () => {
        const merged = mergeCarts([line({ sets: 12 })], [line({ sets: 30 })]);

        expect(merged).toHaveLength(1);
        expect(merged[0].sets).toBe(30);
    });

    it('survives either side being missing', () => {
        expect(mergeCarts(undefined, undefined)).toEqual([]);
        expect(mergeCarts([line()], undefined)).toHaveLength(1);
    });
});

describe('a guest cart', () => {
    it('keeps lines in this browser and never calls the account API', async () => {
        renderCart();

        fireEvent.click(screen.getByText('add white'));

        expect(screen.getByTestId('count')).toHaveTextContent('12');
        await waitFor(() =>
            expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
        );
        expect(getCart).not.toHaveBeenCalled();
        expect(saveCart).not.toHaveBeenCalled();
    });

    it('adds to an existing line instead of repeating it', () => {
        renderCart();

        fireEvent.click(screen.getByText('add white'));
        fireEvent.click(screen.getByText('add white'));

        expect(lines()).toEqual(['serow-oxford/White:24']);
    });

    it('reloads whatever was left in the browser', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([line({ sets: 25 })]));

        renderCart();

        expect(lines()).toEqual(['serow-oxford/White:25']);
    });
});

describe('a signed-in cart', () => {
    beforeEach(() => {
        auth.current = { user: { id: 7 } };
    });

    it('folds the browser cart into the one stored on the account', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([line({ colorName: 'Indigo', sets: 15 })]));
        getCart.mockResolvedValue([line({ sets: 30 })]);

        renderCart();

        await waitFor(() =>
            expect(lines()).toEqual(['serow-oxford/White:30', 'serow-oxford/Indigo:15'])
        );
    });

    it('does not push back a cart it only just pulled', async () => {
        getCart.mockResolvedValue([line()]);
        vi.useFakeTimers();

        renderCart();

        await act(() => vi.advanceTimersByTimeAsync(2000));
        expect(saveCart).not.toHaveBeenCalled();
    });

    it('saves a change to the account, once, after the typing settles', async () => {
        vi.useFakeTimers();
        renderCart();

        await act(() => vi.advanceTimersByTimeAsync(0));

        fireEvent.click(screen.getByText('add white'));
        fireEvent.click(screen.getByText('set 40'));

        await act(() => vi.advanceTimersByTimeAsync(2000));

        expect(saveCart).toHaveBeenCalledTimes(1);
        expect(saveCart).toHaveBeenLastCalledWith([expect.objectContaining({ sets: 40 })]);
    });

    it('pushes the empty cart when the order is placed', async () => {
        getCart.mockResolvedValue([line()]);
        vi.useFakeTimers();
        renderCart();

        await act(() => vi.advanceTimersByTimeAsync(0));
        fireEvent.click(screen.getByText('clear'));
        await act(() => vi.advanceTimersByTimeAsync(2000));

        expect(saveCart).toHaveBeenLastCalledWith([]);
    });

    /* A dropped connection must not be read as "the retailer emptied the cart"
       and pushed over the copy on the account. */
    it('keeps working offline and pushes nothing it could not read first', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([line()]));
        getCart.mockRejectedValue(new Error('offline'));
        vi.useFakeTimers();

        renderCart();

        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(lines()).toEqual(['serow-oxford/White:12']);

        fireEvent.click(screen.getByText('add indigo'));
        await act(() => vi.advanceTimersByTimeAsync(2000));

        expect(saveCart).not.toHaveBeenCalled();
    });
});

describe('switching accounts on one browser', () => {
    it('empties the cart on sign-out', async () => {
        auth.current = { user: { id: 7 } };
        getCart.mockResolvedValue([line()]);

        const { rerender } = renderCart();
        await waitFor(() => expect(lines()).toHaveLength(1));

        auth.current = { user: null };
        rerender(<CartProvider><Harness /></CartProvider>);

        await waitFor(() => expect(lines()).toHaveLength(0));
    });

    it('does not hand the next retailer the previous one’s lines', async () => {
        auth.current = { user: { id: 7 } };
        getCart.mockResolvedValue([line({ sets: 44 })]);

        const { rerender } = renderCart();
        await waitFor(() => expect(lines()).toEqual(['serow-oxford/White:44']));

        // Second retailer signs in on the same machine with an empty cart.
        auth.current = { user: { id: 8 } };
        getCart.mockResolvedValue([]);
        rerender(<CartProvider><Harness /></CartProvider>);

        await waitFor(() => expect(lines()).toHaveLength(0));
    });
});
