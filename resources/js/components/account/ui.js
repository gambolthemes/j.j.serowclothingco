/* Shared control styling for the account forms, so every field, label and
   button in /account reads the same as the login and signup screens. */

export const fieldClass =
    'h-11 w-full border border-foreground/60 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground';

export const labelClass =
    'mb-2 block font-label text-[10px] uppercase tracking-[0.16em] text-foreground/60';

export const primaryButtonClass =
    'flex h-12 items-center justify-center gap-2 bg-foreground px-6 font-label text-xs font-semibold uppercase tracking-[0.16em] text-background disabled:opacity-50';

export const ghostButtonClass =
    'flex h-11 items-center justify-center gap-2 border border-foreground/50 px-4 font-label text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-secondary';

export const cardClass = 'border border-foreground bg-card p-6';

export const errorClass =
    'mt-2 font-label text-[10px] uppercase tracking-[0.12em] text-destructive';
